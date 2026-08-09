// Package proto defines the language-agnostic contract between the ByteArena
// harness and a competitor's solution.
//
// The harness is the host: it owns the simulated device, the workload, and all
// grading. A solution is a separate process, in any language, that reads
// newline-delimited JSON requests on stdin and writes newline-delimited JSON
// responses on stdout. Whatever it writes to stderr is captured and shown back
// to the author as console output; it never influences the score.
//
// Putting the contract at the process boundary instead of in a Go interface is
// the whole point. The simulator never learns which language it is talking to,
// so the same challenge can be solved in Go, Python, C, C++, Java or Rust
// against byte-identical traffic and be scored on the same scale.
//
// # Conversation shape
//
// Every run is one conversation. The host opens it, drives it, and closes it:
//
//	host -> {"v":1,"type":"init","task":"victim-selection","config":{...}}
//	sol  <- {"type":"ready","name":"cost-benefit"}
//	host -> {"type":"reclaim","stats":{...}}       (repeated, many times)
//	sol  <- {"type":"victim","block":7}
//	host -> {"type":"done"}
//
// The solution never speaks first and never sends two responses to one
// request. That keeps the SDK for each language down to a read-loop over
// stdin, which is the only shape that is genuinely idiomatic everywhere.
package proto

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strings"
)

// Version is the protocol revision. The host sends it in the init request so a
// solution built against an older SDK can fail loudly instead of silently
// misreading a field.
const Version = 1

// Task names. A task fixes which request kinds the host will send and which
// responses it expects back, so one process never has to handle all of them.
const (
	// TaskCompaction is the entry-level task: a flat array of slots, some live
	// and some dead, compacted with as few moves as possible.
	TaskCompaction = "compaction"
	// TaskVictimSelection is the middle task: a real block-structured device
	// where the only decision is which block to reclaim.
	TaskVictimSelection = "victim-selection"
	// TaskWearLeveling is the full task: victim selection judged on write
	// amplification and wear spread together, under fault injection.
	TaskWearLeveling = "wear-leveling"
)

// Request kinds, host to solution.
const (
	KindInit    = "init"
	KindCompact = "compact"
	KindReclaim = "reclaim"
	KindDone    = "done"
)

// Response kinds, solution to host.
const (
	KindReady  = "ready"
	KindMoves  = "moves"
	KindVictim = "victim"
	KindError  = "error"
)

// Request is anything the host sends. Only the fields relevant to Type are
// populated; the rest are omitted so a hand-written parser in C or Java only
// has to look at the keys it cares about.
type Request struct {
	V    int    `json:"v,omitempty"`
	Type string `json:"type"`

	// Init only.
	Task   string  `json:"task,omitempty"`
	Config *Config `json:"config,omitempty"`

	// Compact only. Each entry is the logical page living in that slot, or
	// -1 for a dead slot.
	Slots []int `json:"slots,omitempty"`

	// Reclaim only.
	Stats *Stats `json:"stats,omitempty"`
}

// Config is the geometry handed over at init time, so a solution can size its
// own bookkeeping once instead of rediscovering the shape on every request.
type Config struct {
	Blocks              int `json:"blocks,omitempty"`
	PagesPerBlock       int `json:"pagesPerBlock,omitempty"`
	OverProvisionBlocks int `json:"overProvisionBlocks,omitempty"`

	// SlotCount is set for the compaction task instead of the block geometry.
	SlotCount int `json:"slotCount,omitempty"`
}

// BlockStat is one block's occupancy, copied fresh for every request. A
// solution can hold onto it safely; it is never aliased to live device state.
type BlockStat struct {
	Index      int `json:"index"`
	Valid      int `json:"valid"`
	Invalid    int `json:"invalid"`
	Free       int `json:"free"`
	EraseCount int `json:"eraseCount"`
	// IsOverProvision marks the reserved blocks that host writes never target.
	// Reclaiming one shrinks the migration reserve, which is nearly always a
	// mistake, so the flag is surfaced rather than left to be inferred.
	IsOverProvision bool `json:"isOverProvision"`
}

// Stats is the whole-device view attached to a reclaim request.
type Stats struct {
	Blocks        []BlockStat `json:"blocks"`
	PagesPerBlock int         `json:"pagesPerBlock"`
	TotalErases   int         `json:"totalErases"`
	FreePages     int         `json:"freePages"`
	ValidPages    int         `json:"validPages"`
	InvalidPages  int         `json:"invalidPages"`
}

// Response is anything a solution sends back.
//
// Block deliberately has no omitempty: block zero is a legitimate answer, and
// dropping the key for it would make the most common off-by-one bug in a
// hand-rolled SDK invisible.
type Response struct {
	Type string `json:"type"`

	// Ready only.
	Name string `json:"name,omitempty"`

	// Victim only.
	Block int `json:"block"`

	// Moves only. Each pair is {from, to} in slot indices.
	Moves [][2]int `json:"moves,omitempty"`

	// Error only.
	Message string `json:"message,omitempty"`
}

// maxLine caps a single JSON line. Stats for the largest geometry we ship are
// far under this; the limit exists so a solution that emits an unbounded line
// is rejected rather than allowed to exhaust host memory.
const maxLine = 8 << 20

// Decoder reads newline-delimited JSON from a stream.
type Decoder struct {
	scanner *bufio.Scanner
}

// NewDecoder wraps a reader. It tolerates blank lines, which hand-written
// clients emit surprisingly often.
func NewDecoder(r io.Reader) *Decoder {
	s := bufio.NewScanner(r)
	s.Buffer(make([]byte, 0, 64<<10), maxLine)
	return &Decoder{scanner: s}
}

// DecodeResponse reads the next response. It returns io.EOF when the stream
// ends cleanly.
func (d *Decoder) DecodeResponse() (Response, error) {
	line, err := d.next()
	if err != nil {
		return Response{}, err
	}
	var resp Response
	if err := json.Unmarshal(line, &resp); err != nil {
		return Response{}, fmt.Errorf("solution sent a line that is not valid JSON: %w (line: %s)", err, truncate(line))
	}
	if resp.Type == "" {
		return Response{}, fmt.Errorf(`solution sent JSON with no "type" field (line: %s)`, truncate(line))
	}
	return resp, nil
}

// DecodeRequest reads the next request. SDKs written in Go use this; the other
// languages parse the same lines themselves.
func (d *Decoder) DecodeRequest() (Request, error) {
	line, err := d.next()
	if err != nil {
		return Request{}, err
	}
	var req Request
	if err := json.Unmarshal(line, &req); err != nil {
		return Request{}, fmt.Errorf("host sent a line that is not valid JSON: %w", err)
	}
	return req, nil
}

// next returns the next non-blank line.
func (d *Decoder) next() ([]byte, error) {
	for {
		if !d.scanner.Scan() {
			if err := d.scanner.Err(); err != nil {
				return nil, err
			}
			return nil, io.EOF
		}
		line := d.scanner.Bytes()
		if len(strings.TrimSpace(string(line))) == 0 {
			continue
		}
		// The scanner reuses its buffer between calls, so the caller gets a
		// copy rather than a window that the next Scan will overwrite.
		out := make([]byte, len(line))
		copy(out, line)
		return out, nil
	}
}

// Encoder writes newline-delimited JSON, flushing after every message. A
// solution blocks waiting for each request, so anything held in a buffer is a
// deadlock rather than a slow write.
type Encoder struct {
	w  *bufio.Writer
	je *json.Encoder
}

// NewEncoder wraps a writer.
func NewEncoder(w io.Writer) *Encoder {
	bw := bufio.NewWriter(w)
	je := json.NewEncoder(bw)
	// Compact output: these lines are machine-read on both ends, and pretty
	// printing would break the one-message-per-line framing.
	je.SetIndent("", "")
	return &Encoder{w: bw, je: je}
}

// EncodeRequest writes a request and flushes.
func (e *Encoder) EncodeRequest(req Request) error {
	if err := e.je.Encode(req); err != nil {
		return err
	}
	return e.w.Flush()
}

// EncodeResponse writes a response and flushes.
func (e *Encoder) EncodeResponse(resp Response) error {
	if err := e.je.Encode(resp); err != nil {
		return err
	}
	return e.w.Flush()
}

func truncate(b []byte) string {
	const limit = 200
	s := strings.TrimSpace(string(b))
	if len(s) <= limit {
		return s
	}
	return s[:limit] + "..."
}
