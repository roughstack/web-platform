package proto

import (
	"errors"
	"fmt"
	"io"
	"os/exec"
	"sync"
	"time"
)

// DefaultRequestTimeout bounds one request/response exchange. The container
// also enforces an overall wall clock, but that only tells the author their run
// was killed. Timing out a single exchange lets us say which one hung, which is
// the difference between a useful error and a shrug.
const DefaultRequestTimeout = 10 * time.Second

// maxStderr caps captured console output. A solution printing inside a hot loop
// can produce hundreds of megabytes; past a point it stops being debuggable
// anyway, so we keep the head and say how much was dropped.
const maxStderr = 256 << 10

// Host drives a solution running as a child process.
//
// Every method is sticky on failure: once the conversation breaks, all
// subsequent calls return the original error rather than a cascade of
// downstream ones. The first thing that went wrong is the only thing worth
// showing the author.
type Host struct {
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	enc     *Encoder
	dec     *Decoder
	stderr  *cappedBuffer
	timeout time.Duration

	name string
	err  error
	done bool
}

// HostConfig configures a child solution process.
type HostConfig struct {
	// Command is the argv of the solution process, already built.
	Command []string
	// Dir is the working directory for the child.
	Dir string
	// Env is the child's full environment. A nil value inherits the host's.
	//
	// It used to mean an empty environment, on the theory that a solution
	// should be handed nothing. That was the wrong place to enforce it: a
	// compiled solution does not care, but Python cannot find its SDK without
	// PYTHONPATH and the JVM needs a PATH, so stripping the environment
	// silently broke half the languages while securing nothing. Isolation is
	// the container's job, and the container is where it is done.
	Env []string
	// Task and Config are sent in the init request.
	Task   string
	Config Config
	// RequestTimeout bounds a single exchange. Zero means DefaultRequestTimeout.
	RequestTimeout time.Duration
}

// StartHost launches the solution and completes the init handshake. On success
// the solution has already identified itself and is waiting for work.
func StartHost(cfg HostConfig) (*Host, error) {
	if len(cfg.Command) == 0 {
		return nil, errors.New("proto: no command to run the solution")
	}

	timeout := cfg.RequestTimeout
	if timeout <= 0 {
		timeout = DefaultRequestTimeout
	}

	cmd := exec.Command(cfg.Command[0], cfg.Command[1:]...)
	cmd.Dir = cfg.Dir
	cmd.Env = cfg.Env

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("proto: cannot open solution stdin: %w", err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("proto: cannot open solution stdout: %w", err)
	}
	stderr := &cappedBuffer{limit: maxStderr}
	cmd.Stderr = stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("proto: cannot start the solution: %w", err)
	}

	h := &Host{
		cmd:     cmd,
		stdin:   stdin,
		enc:     NewEncoder(stdin),
		dec:     NewDecoder(stdout),
		stderr:  stderr,
		timeout: timeout,
	}

	resp, err := h.roundTrip(Request{
		V:      Version,
		Type:   KindInit,
		Task:   cfg.Task,
		Config: &cfg.Config,
	})
	if err != nil {
		return nil, h.startFailure(err)
	}
	if resp.Type != KindReady {
		return nil, h.startFailure(fmt.Errorf(
			"solution answered %q to the init handshake, expected %q", resp.Type, KindReady,
		))
	}

	h.name = resp.Name
	if h.name == "" {
		h.name = "solution"
	}
	return h, nil
}

// Name is what the solution called itself during the handshake.
func (h *Host) Name() string { return h.name }

// Console returns everything the solution wrote to stderr. This is shown to the
// author verbatim and never parsed.
func (h *Host) Console() string { return h.stderr.String() }

// Err returns the failure that ended the conversation, if any.
func (h *Host) Err() error { return h.err }

// Victim asks which block to reclaim.
func (h *Host) Victim(stats Stats) (int, error) {
	resp, err := h.roundTrip(Request{Type: KindReclaim, Stats: &stats})
	if err != nil {
		return 0, err
	}
	if resp.Type != KindVictim {
		return 0, h.fail(fmt.Errorf("solution answered %q to a reclaim request, expected %q", resp.Type, KindVictim))
	}
	return resp.Block, nil
}

// Compact asks for the moves that compact a slot array.
func (h *Host) Compact(slots []int) ([][2]int, error) {
	resp, err := h.roundTrip(Request{Type: KindCompact, Slots: slots})
	if err != nil {
		return nil, err
	}
	if resp.Type != KindMoves {
		return nil, h.fail(fmt.Errorf("solution answered %q to a compact request, expected %q", resp.Type, KindMoves))
	}
	return resp.Moves, nil
}

// Close ends the conversation politely, then makes sure the process is gone.
func (h *Host) Close() error {
	if h.done {
		return h.err
	}
	h.done = true

	// Best effort: a solution that has already crashed will not read this, and
	// that is not a new failure worth reporting.
	if h.err == nil {
		_ = h.enc.EncodeRequest(Request{Type: KindDone})
	}
	h.shutdown()
	return h.err
}

// shutdown closes stdin so a well-behaved solution exits on EOF, then waits
// briefly before killing it.
func (h *Host) shutdown() {
	_ = h.stdin.Close()

	waited := make(chan error, 1)
	go func() { waited <- h.cmd.Wait() }()

	select {
	case <-waited:
	case <-time.After(2 * time.Second):
		h.kill()
		<-waited
	}
}

func (h *Host) kill() {
	if h.cmd.Process != nil {
		_ = h.cmd.Process.Kill()
	}
}

// roundTrip sends one request and waits for exactly one response.
func (h *Host) roundTrip(req Request) (Response, error) {
	if h.err != nil {
		return Response{}, h.err
	}

	if err := h.enc.EncodeRequest(req); err != nil {
		return Response{}, h.fail(fmt.Errorf("solution stopped reading its input: %w", err))
	}

	type outcome struct {
		resp Response
		err  error
	}
	ch := make(chan outcome, 1)
	go func() {
		resp, err := h.dec.DecodeResponse()
		ch <- outcome{resp, err}
	}()

	select {
	case got := <-ch:
		if got.err != nil {
			if errors.Is(got.err, io.EOF) {
				return Response{}, h.fail(errors.New("solution exited before answering"))
			}
			return Response{}, h.fail(got.err)
		}
		if got.resp.Type == KindError {
			msg := got.resp.Message
			if msg == "" {
				msg = "no detail given"
			}
			return Response{}, h.fail(fmt.Errorf("solution reported an error: %s", msg))
		}
		return got.resp, nil

	case <-time.After(h.timeout):
		// Killing the child unblocks the reader goroutine by closing the pipe.
		h.kill()
		return Response{}, h.fail(fmt.Errorf("solution did not answer within %s", h.timeout))
	}
}

// fail records the first error and returns it.
// StartError is what a failed handshake returns. It carries whatever the
// solution printed on its way down.
//
// This exists because the console is the only evidence of an early crash, and
// a Host that never finished starting is not safe to hand back to the caller
// just so it can be asked. An interpreter's traceback arrives on stderr and
// nowhere else — without this, a missing import looked identical to a solution
// that simply chose not to answer.
type StartError struct {
	Err     error
	Console string
}

func (e *StartError) Error() string { return e.Err.Error() }
func (e *StartError) Unwrap() error { return e.Err }

// startFailure shuts the child down and wraps the reason together with its
// output. Shutdown has to happen first: it waits on the process, which is what
// guarantees stderr has been fully drained into the buffer.
func (h *Host) startFailure(err error) error {
	err = h.fail(err)
	h.shutdown()
	return &StartError{Err: err, Console: h.Console()}
}

func (h *Host) fail(err error) error {
	if h.err == nil {
		h.err = err
	}
	return h.err
}

// cappedBuffer keeps the first limit bytes and counts the rest. It is written
// by the goroutine exec uses to drain stderr and read from the main goroutine,
// so every access is guarded.
type cappedBuffer struct {
	mu      sync.Mutex
	buf     []byte
	limit   int
	dropped int
}

func (c *cappedBuffer) Write(p []byte) (int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	room := c.limit - len(c.buf)
	if room > 0 {
		n := len(p)
		if n > room {
			n = room
		}
		c.buf = append(c.buf, p[:n]...)
		c.dropped += len(p) - n
	} else {
		c.dropped += len(p)
	}
	// Always report a full write: the child should not get a short-write error
	// just because we stopped keeping its output.
	return len(p), nil
}

func (c *cappedBuffer) String() string {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.dropped == 0 {
		return string(c.buf)
	}
	return fmt.Sprintf("%s\n... %d more bytes of output were dropped", c.buf, c.dropped)
}
