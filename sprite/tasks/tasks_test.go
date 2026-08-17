package tasks_test

import (
	"os"
	"strings"
	"testing"

	"github.com/bytearena/sprite/proto"
	"github.com/bytearena/sprite/sdk"
	"github.com/bytearena/sprite/tasks"
)

// Each test spawns this binary as the solution, choosing a behaviour with an
// environment variable, so the whole pipeline is exercised: registry lookup,
// process spawn, handshake, grading and the Outcome that comes back.
const behaviourVar = "BYTEARENA_TASK_TEST_BEHAVIOUR"

func TestMain(m *testing.M) {
	if behaviour := os.Getenv(behaviourVar); behaviour != "" {
		switch behaviour {
		case "good":
			sdk.Run(competent{})
		case "lazy":
			sdk.Run(lazy{})
		default:
			os.Exit(1)
		}
		return
	}
	os.Exit(m.Run())
}

// competent solves both shapes of task properly.
type competent struct{}

func (competent) Name() string { return "competent" }

func (competent) SelectVictim(s sdk.Stats) int {
	best, mostInvalid := -1, -1
	for _, b := range s.Blocks {
		if b.Invalid > mostInvalid {
			mostInvalid, best = b.Invalid, b.Index
		}
	}
	if best < 0 || mostInvalid == 0 {
		fewest := s.PagesPerBlock + 1
		for _, b := range s.Blocks {
			if b.IsOverProvision {
				continue
			}
			if b.Valid > 0 && b.Valid < fewest {
				fewest, best = b.Valid, b.Index
			}
		}
	}
	return best
}

// Compact pairs each live value past the prefix with an empty slot inside it,
// which is the optimal strategy.
func (competent) Compact(slots []int) [][2]int {
	live := 0
	for _, v := range slots {
		if v != -1 {
			live++
		}
	}

	var holes []int
	for i := 0; i < live; i++ {
		if slots[i] == -1 {
			holes = append(holes, i)
		}
	}

	moves := [][2]int{}
	next := 0
	for i := live; i < len(slots); i++ {
		if slots[i] == -1 {
			continue
		}
		moves = append(moves, [2]int{i, holes[next]})
		next++
	}
	return moves
}

// lazy answers the protocol correctly but does no useful work, which is the
// most common shape of a wrong first attempt.
type lazy struct{ competent }

func (lazy) Compact([]int) [][2]int { return nil }

func start(t *testing.T, task tasks.Task, params tasks.Params, behaviour string) *proto.Host {
	t.Helper()

	host, err := proto.StartHost(proto.HostConfig{
		Command: []string{os.Args[0]},
		Env:     []string{behaviourVar + "=" + behaviour},
		Task:    task.Protocol(),
		Config:  task.Config(params),
	})
	if err != nil {
		t.Fatalf("starting the %s solution: %v", behaviour, err)
	}
	t.Cleanup(func() { _ = host.Close() })
	return host
}

// factoryFor returns a HostFactory that starts fresh processes with the same
// behaviour as the host a test already started. The wear-leveling rung uses it
// to give each adversarial scenario its own process.
func factoryFor(t *testing.T, task tasks.Task, params tasks.Params, behaviour string) tasks.HostFactory {
	t.Helper()
	return func() (*proto.Host, error) {
		h, err := proto.StartHost(proto.HostConfig{
			Command: []string{os.Args[0]},
			Env:     []string{behaviourVar + "=" + behaviour},
			Task:    task.Protocol(),
			Config:  task.Config(params),
		})
		if err != nil {
			return nil, err
		}
		t.Cleanup(func() { _ = h.Close() })
		return h, nil
	}
}

func TestEveryRungGradesACompetentSolution(t *testing.T) {
	// Small geometries keep the suite fast; the rungs are being checked for
	// wiring, not for how they behave at scale.
	cases := []struct {
		task   string
		params tasks.Params
		// wantMetrics are keys the frontend relies on being present.
		wantMetrics []string
	}{
		{
			task:        "compaction",
			params:      tasks.Params{Seed: 3, Slots: 48, LiveFraction: 0.5},
			wantMetrics: []string{"moves", "optimal", "efficiency"},
		},
		{
			task:        "victim-selection",
			params:      tasks.Params{Seed: 3, Blocks: 8, PagesPerBlock: 16, OverProvisionBlocks: 2, Operations: 400, LogicalPages: 96},
			wantMetrics: []string{"write_amplification", "host_writes", "gc_writes", "total_erases"},
		},
		{
			task:        "wear-leveling",
			params:      tasks.Params{Seed: 3, Blocks: 8, PagesPerBlock: 16, OverProvisionBlocks: 2, Operations: 400, LogicalPages: 96},
			wantMetrics: []string{"write_amplification", "wear_spread", "max_erase_count", "adversarial_passed"},
		},
	}

	for _, c := range cases {
		t.Run(c.task, func(t *testing.T) {
			task, err := tasks.Lookup(c.task)
			if err != nil {
				t.Fatalf("looking up the task: %v", err)
			}

			params := task.Defaults(c.params)
			outcome := task.Run(start(t, task, params, "good"), factoryFor(t, task, params, "good"), params)

			if !outcome.Passed {
				t.Fatalf("a competent solution should pass, got: %s", outcome.Error)
			}
			for _, key := range c.wantMetrics {
				if _, ok := outcome.Metrics[key]; !ok {
					t.Errorf("metrics are missing %q; got keys %v", key, keysOf(outcome.Metrics))
				}
			}
			if outcome.Detail == nil {
				t.Error("outcome has no detail payload for the illustrations to draw")
			}
		})
	}
}

func TestCompactionRejectsASolutionThatDoesNothing(t *testing.T) {
	task, err := tasks.Lookup("compaction")
	if err != nil {
		t.Fatalf("looking up the task: %v", err)
	}

	params := task.Defaults(tasks.Params{Seed: 3, Slots: 48, LiveFraction: 0.5})
	outcome := task.Run(start(t, task, params, "lazy"), factoryFor(t, task, params, "lazy"), params)

	if outcome.Passed {
		t.Fatal("a solution that returns no moves should not pass a fragmented array")
	}
	if outcome.Error == "" {
		t.Error("a failing outcome should explain what went wrong")
	}
	// The failure still carries metrics and detail, so the arena can show the
	// author what state their attempt left the array in.
	if outcome.Detail == nil {
		t.Error("a failing outcome should still carry detail to render")
	}
}

func TestCompactionScoresAnOptimalSolutionPerfectly(t *testing.T) {
	task, err := tasks.Lookup("compaction")
	if err != nil {
		t.Fatalf("looking up the task: %v", err)
	}

	params := task.Defaults(tasks.Params{Seed: 11, Slots: 64, LiveFraction: 0.6})
	outcome := task.Run(start(t, task, params, "good"), factoryFor(t, task, params, "good"), params)

	if !outcome.Passed {
		t.Fatalf("expected a pass, got: %s", outcome.Error)
	}
	if outcome.Metrics["efficiency"] != 1 {
		t.Errorf("efficiency is %v, but the strategy used is optimal",
			outcome.Metrics["efficiency"])
	}
	if outcome.Metrics["moves"] != outcome.Metrics["optimal"] {
		t.Errorf("used %v moves against an optimum of %v",
			outcome.Metrics["moves"], outcome.Metrics["optimal"])
	}
}

func TestLookupRejectsAnUnknownTaskAndSaysWhatExists(t *testing.T) {
	_, err := tasks.Lookup("does-not-exist")
	if err == nil {
		t.Fatal("expected an error for an unregistered task")
	}
	for _, known := range tasks.Names() {
		if !strings.Contains(err.Error(), known) {
			t.Errorf("the error should list %q among the known tasks, got: %v", known, err)
		}
	}
}

func TestEveryRungIsRegistered(t *testing.T) {
	want := []string{"compaction", "victim-selection", "wear-leveling"}
	got := strings.Join(tasks.Names(), ",")
	for _, name := range want {
		if !strings.Contains(got, name) {
			t.Errorf("task %q is not registered; registry has %v", name, tasks.Names())
		}
	}
}

func keysOf(m map[string]float64) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
