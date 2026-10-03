// Package tasks is the registry of gradable challenges.
//
// Each rung of the ladder — and eventually each new domain, whether that is LSM
// trees or write-ahead logs — registers a Task under a name. The runner looks
// the name up and never learns anything about what it does. Adding a challenge
// family means adding a package and one init function, not editing a switch in
// the runner.
//
// The registry mirrors the one on the frontend, where a pack registers its
// block kinds and illustrations. Same shape on both sides of the wire: a stable
// core, and extension at a declared seam.
package tasks

import (
	"fmt"
	"sort"
	"sync"

	"github.com/roughstack/execution-runtime/proto"
)

// Params carries every knob any task might need. Tasks read the fields they
// care about and ignore the rest, which keeps the runner's flag set flat and
// means a new task does not change the invocation contract.
type Params struct {
	Seed int64

	// Block-device geometry, used by the victim-selection and wear rungs.
	Blocks              int
	PagesPerBlock       int
	OverProvisionBlocks int
	LogicalPages        int
	Operations          int
	HotFraction         float64
	HotProbability      float64

	// Flat-array geometry, used by the compaction rung.
	Slots        int
	LiveFraction float64
}

// Outcome is what every task reports, whatever it measures.
//
// Metrics is deliberately a flat map of numbers: the frontend decides how to
// label, format and score them from the challenge's own configuration, so a new
// task can surface a new measurement without a schema migration. Detail is the
// task-specific payload the illustrations draw from.
type Outcome struct {
	Passed  bool               `json:"passed"`
	Error   string             `json:"error,omitempty"`
	Metrics map[string]float64 `json:"metrics"`
	Detail  any                `json:"detail,omitempty"`

	// Baseline is the reference solution's result on this exact instance,
	// keyed the same way as Metrics.
	//
	// It has to be measured rather than stored, because every session gets a
	// slightly different device. A write amplification of 1.30 is excellent on
	// one geometry and mediocre on another, so a constant baseline in the
	// challenge's seed data would quietly turn the leaderboard into a ranking
	// of who drew the kindest workload.
	Baseline map[string]float64 `json:"baseline,omitempty"`
}

// HostFactory starts a fresh solution process configured for the same task and
// geometry as the host the runner already started. A task uses it when it needs
// more than one process — notably the wear-leveling rung, which must give each
// adversarial scenario a fresh solution so a stateful policy cannot carry state
// from one scenario into the next.
//
// The factory exists because isolation is a property of the harness, not of the
// solution: a stateless solution would be fine sharing one process, but a
// stateful one would silently leak scenario 1's learned thresholds into
// scenario 2, and the whole point of the adversarial suite is to catch exactly
// that. Making the caller ask for a fresh process each time is the only way to
// guarantee it.
type HostFactory func() (*proto.Host, error)

// Task is one gradable challenge.
type Task interface {
	// Name is the registry key, and the value the frontend stores per challenge.
	Name() string
	// Protocol is the task identifier announced to the solution at handshake
	// time, which tells its SDK which methods it must implement.
	Protocol() string
	// Config is the geometry sent in the init request.
	Config(p Params) proto.Config
	// Defaults fills in any parameter left at its zero value, so a caller only
	// has to specify what it wants to override.
	Defaults(p Params) Params
	// Run grades one attempt. A solution that misbehaves produces a failing
	// Outcome rather than an error; an error means the harness itself broke.
	//
	// The host is the solution's first process; the task owns it for the
	// duration of the run and must Close it when it is done (the runner also
	// closes it, and Close is idempotent). newHost starts a fresh process with
	// the same configuration, for tasks that need one process per phase.
	Run(host *proto.Host, newHost HostFactory, p Params) Outcome
}

var (
	mu       sync.RWMutex
	registry = map[string]Task{}
)

// Register adds a task. It panics on a duplicate name, because two tasks
// answering to one name is a build-time mistake that would otherwise surface as
// a silently mis-graded submission.
func Register(task Task) {
	mu.Lock()
	defer mu.Unlock()

	name := task.Name()
	if _, taken := registry[name]; taken {
		panic(fmt.Sprintf("tasks: %q is registered twice", name))
	}
	registry[name] = task
}

// Lookup finds a task by name.
func Lookup(name string) (Task, error) {
	mu.RLock()
	defer mu.RUnlock()

	task, ok := registry[name]
	if !ok {
		return nil, fmt.Errorf("tasks: no task named %q (known tasks: %v)", name, names())
	}
	return task, nil
}

// Names lists every registered task, sorted.
func Names() []string {
	mu.RLock()
	defer mu.RUnlock()
	return names()
}

func names() []string {
	out := make([]string, 0, len(registry))
	for name := range registry {
		out = append(out, name)
	}
	sort.Strings(out)
	return out
}

// failed builds an Outcome for a solution that broke the rules or the
// conversation. Metrics is never nil, so the frontend can index it freely.
func failed(err error, metrics map[string]float64, detail any) Outcome {
	if metrics == nil {
		metrics = map[string]float64{}
	}
	return Outcome{Passed: false, Error: err.Error(), Metrics: metrics, Detail: detail}
}
