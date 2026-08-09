// Command runner grades one submission and prints a JSON result to stdout.
//
// It is deliberately ignorant of both ends of what it connects. It does not
// know which language the solution is written in — that is settled before it
// runs, and it receives an already-runnable command. And it does not know what
// the challenge measures — it looks a task up in the registry by name.
//
// Usage:
//
//	runner --task victim-selection --seed 42 -- /tmp/solution
//	runner --task compaction --seed 7 -- python3 /tmp/solution.py
//
// Everything after the -- separator is the command that runs the solution.
package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/bytearena/sprite/proto"
	"github.com/bytearena/sprite/tasks"
)

// report is the single shape the backend parses, whatever the task measured.
type report struct {
	Task         string             `json:"task"`
	SolutionName string             `json:"solution_name"`
	Passed       bool               `json:"passed"`
	Error        string             `json:"error,omitempty"`
	Metrics      map[string]float64 `json:"metrics"`
	// Baseline is the reference solution's result on the same instance, which
	// is what the score is relative to.
	Baseline map[string]float64 `json:"baseline,omitempty"`
	Detail   any                `json:"detail,omitempty"`
	// Console is everything the solution wrote to stderr, shown verbatim in the
	// arena. It never influences the score.
	Console         string `json:"console,omitempty"`
	ExecutionTimeMs int64  `json:"execution_time_ms"`
	TimedOut        bool   `json:"timed_out"`
}

func main() {
	var (
		taskName   = flag.String("task", "victim-selection", "which registered task to grade against")
		seed       = flag.Int64("seed", 42, "workload seed, so grading is reproducible")
		timeoutSec = flag.Int("timeout", 30, "wall-clock budget for the whole run, in seconds")
		listTasks  = flag.Bool("list-tasks", false, "print the registered task names and exit")

		operations    = flag.Int("operations", 0, "write operations in the workload")
		blocks        = flag.Int("blocks", 0, "addressable blocks")
		pagesPerBlock = flag.Int("pages-per-block", 0, "pages per block")
		opBlocks      = flag.Int("op-blocks", 0, "over-provision blocks reserved for migration")
		logicalPages  = flag.Int("logical-pages", 0, "size of the logical address space")
		hotFraction   = flag.Float64("hot-fraction", 0, "share of the address space that is hot")
		hotProb       = flag.Float64("hot-probability", 0, "chance a write targets the hot set")

		slots        = flag.Int("slots", 0, "slots in the array, for the compaction task")
		liveFraction = flag.Float64("live-fraction", 0, "share of slots holding live data")
	)

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "usage: runner [flags] -- <command to run the solution>\n\n")
		flag.PrintDefaults()
	}
	flag.Parse()

	if *listTasks {
		fmt.Println(strings.Join(tasks.Names(), "\n"))
		return
	}

	command := flag.Args()
	if len(command) == 0 {
		fmt.Fprintln(os.Stderr, "runner: no solution command given; put it after --")
		os.Exit(1)
	}

	task, err := tasks.Lookup(*taskName)
	if err != nil {
		emit(report{Task: *taskName, Error: err.Error(), Metrics: map[string]float64{}})
		os.Exit(1)
	}

	params := task.Defaults(tasks.Params{
		Seed:                *seed,
		Blocks:              *blocks,
		PagesPerBlock:       *pagesPerBlock,
		OverProvisionBlocks: *opBlocks,
		LogicalPages:        *logicalPages,
		Operations:          *operations,
		HotFraction:         *hotFraction,
		HotProbability:      *hotProb,
		Slots:               *slots,
		LiveFraction:        *liveFraction,
	})

	budget := time.Duration(*timeoutSec) * time.Second
	deadline := time.Now().Add(budget)
	start := time.Now()

	host, err := proto.StartHost(proto.HostConfig{
		Command: command,
		Task:    task.Protocol(),
		Config:  task.Config(params),
		Env:     solutionEnv(),
		// No single exchange may consume the whole budget, or a solution that
		// hangs on its first answer would look identical to one that is merely
		// slow overall.
		RequestTimeout: perRequestTimeout(budget),
	})
	if err != nil {
		// A solution that dies during the handshake has usually printed the
		// reason — a traceback, a missing symbol — and that output is the only
		// useful thing we can tell its author.
		var startErr *proto.StartError
		console := ""
		if errors.As(err, &startErr) {
			console = startErr.Console
		}

		emit(report{
			Task:            task.Name(),
			Error:           err.Error(),
			Metrics:         map[string]float64{},
			Console:         console,
			ExecutionTimeMs: time.Since(start).Milliseconds(),
		})
		os.Exit(2)
	}

	outcome := task.Run(host, params)
	console := host.Console()
	name := host.Name()
	_ = host.Close()

	result := report{
		Task:            task.Name(),
		SolutionName:    name,
		Passed:          outcome.Passed,
		Error:           outcome.Error,
		Metrics:         outcome.Metrics,
		Baseline:        outcome.Baseline,
		Detail:          outcome.Detail,
		Console:         console,
		ExecutionTimeMs: time.Since(start).Milliseconds(),
		TimedOut:        time.Now().After(deadline),
	}
	if result.Metrics == nil {
		result.Metrics = map[string]float64{}
	}
	if result.TimedOut {
		result.Passed = false
		if result.Error == "" {
			result.Error = fmt.Sprintf("the run exceeded its %s budget", budget)
		}
	}

	emit(result)
	if !result.Passed {
		os.Exit(2)
	}
}

// perRequestTimeout gives a single exchange a slice of the overall budget.
func perRequestTimeout(budget time.Duration) time.Duration {
	slice := budget / 3
	if slice < time.Second {
		return time.Second
	}
	if slice > proto.DefaultRequestTimeout {
		return proto.DefaultRequestTimeout
	}
	return slice
}

// solutionEnv is the environment a solution runs with: almost nothing.
//
// PATH is needed because interpreted languages are launched through their
// interpreter, and the JVM insists on somewhere to put its own scratch files.
// Everything else the host process holds stays with the host process.
// passedThrough are the variables a solution's runtime is allowed to inherit.
//
// The list is short on purpose, but it has to be complete: an interpreted
// language cannot find its own SDK without the variable that points at it, and
// omitting one does not fail loudly — the process dies during the handshake
// and looks like a solution that chose not to answer.
var passedThrough = []string{
	"PATH",
	"HOME",
	// Where the Python and Java SDKs are installed.
	"PYTHONPATH",
	"CLASSPATH",
	"JAVA_HOME",
}

func solutionEnv() []string {
	env := make([]string, 0, len(passedThrough)+2)
	for _, name := range passedThrough {
		if value := os.Getenv(name); value != "" {
			env = append(env, name+"="+value)
		}
	}
	return append(env,
		"LANG=C.UTF-8",
		// An interpreter that buffers its stdout would deadlock the
		// conversation, since the host waits for each reply before sending
		// more work.
		"PYTHONUNBUFFERED=1",
	)
}

func emit(r report) {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(r); err != nil {
		fmt.Fprintf(os.Stderr, "runner: could not encode the result: %v\n", err)
		os.Exit(1)
	}
}
