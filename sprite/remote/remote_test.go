package remote_test

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/roughstack/execution-runtime/ftl"
	"github.com/roughstack/execution-runtime/proto"
	"github.com/roughstack/execution-runtime/remote"
	"github.com/roughstack/execution-runtime/sdk"
	"github.com/roughstack/execution-runtime/solution"
)

// The tests spawn this same test binary as the child solution, selecting a
// behaviour with an environment variable. That exercises the real process
// boundary — two pipes, a separate address space, an independent exit — rather
// than a pair of in-memory buffers pretending to be one.
const behaviourVar = "BYTEARENA_TEST_BEHAVIOUR"

func TestMain(m *testing.M) {
	if behaviour := os.Getenv(behaviourVar); behaviour != "" {
		runChild(behaviour)
		return
	}
	os.Exit(m.Run())
}

func runChild(behaviour string) {
	switch behaviour {
	case "greedy":
		sdk.Run(greedy{})
	case "chatty":
		sdk.Run(chatty{})
	case "out-of-range":
		sdk.Run(outOfRange{})
	case "crash":
		os.Exit(3)
	case "slow":
		sdk.Run(slow{})
	default:
		fmt.Fprintf(os.Stderr, "unknown behaviour %q\n", behaviour)
		os.Exit(1)
	}
}

// greedy mirrors the in-process reference policy exactly, so the two can be
// compared metric for metric.
type greedy struct{}

func (greedy) Name() string { return "greedy" }

func (greedy) SelectVictim(s sdk.Stats) int {
	best, mostInvalid := -1, -1
	for _, b := range s.Blocks {
		if b.Invalid > mostInvalid {
			mostInvalid, best = b.Invalid, b.Index
		}
	}
	if best < 0 || mostInvalid == 0 {
		minValid := s.PagesPerBlock + 1
		for _, b := range s.Blocks {
			if b.IsOverProvision {
				continue
			}
			if b.Valid > 0 && b.Valid < minValid {
				minValid, best = b.Valid, b.Index
			}
		}
	}
	return best
}

// chatty prints on every decision, using every printing route a competitor is
// likely to reach for. None of it may corrupt the protocol.
type chatty struct{ greedy }

func (c chatty) SelectVictim(s sdk.Stats) int {
	fmt.Println("plain Println to stdout")
	fmt.Printf("Printf with %d blocks\n", len(s.Blocks))
	os.Stdout.WriteString("a direct write to os.Stdout\n")
	sdk.Log("and the explicit Log helper")
	return c.greedy.SelectVictim(s)
}

type outOfRange struct{ greedy }

func (outOfRange) SelectVictim(sdk.Stats) int { return 9999 }

type slow struct{ greedy }

func (slow) SelectVictim(sdk.Stats) int {
	time.Sleep(30 * time.Second)
	return 0
}

// startRemote spawns this binary as a solution with the given behaviour.
func startRemote(t *testing.T, behaviour string, cfg ftl.DeviceConfig, timeout time.Duration) *remote.Policy {
	t.Helper()

	host, err := proto.StartHost(proto.HostConfig{
		Command: []string{os.Args[0]},
		Env:     []string{behaviourVar + "=" + behaviour},
		Task:    proto.TaskVictimSelection,
		Config: proto.Config{
			Blocks:              cfg.Blocks,
			PagesPerBlock:       cfg.PagesPerBlock,
			OverProvisionBlocks: cfg.OverProvisionBlocks,
		},
		RequestTimeout: timeout,
	})
	if err != nil {
		t.Fatalf("starting the %s solution: %v", behaviour, err)
	}
	t.Cleanup(func() { _ = host.Close() })
	return remote.New(host)
}

func testConfig() ftl.DeviceConfig {
	return ftl.DeviceConfig{Blocks: 8, PagesPerBlock: 16, OverProvisionBlocks: 2}
}

func testWorkload() []int {
	return ftl.GenerateWorkload(ftl.WorkloadConfig{
		Seed: 42, Operations: 600, LogicalPages: 96,
		HotFraction: 0.2, HotProbability: 0.8,
	})
}

// TestRemoteMatchesInProcess is the load-bearing test. If a solution running in
// another process does not produce identical metrics to the same logic running
// in-process, the protocol has changed the outcome, and every score on the
// platform is suspect.
func TestRemoteMatchesInProcess(t *testing.T) {
	cfg, workload := testConfig(), testWorkload()

	native, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: workload, Policy: solution.New(),
	})
	if err != nil {
		t.Fatalf("in-process run failed: %v", err)
	}

	viaProtocol, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: workload,
		Policy: startRemote(t, "greedy", cfg, 0),
	})
	if err != nil {
		t.Fatalf("remote run failed: %v", err)
	}

	if !native.Passed || !viaProtocol.Passed {
		t.Fatalf("expected both runs to pass, got native=%v remote=%v", native.Passed, viaProtocol.Passed)
	}
	if native.HostWrites != viaProtocol.HostWrites {
		t.Errorf("host writes differ: in-process %d, remote %d", native.HostWrites, viaProtocol.HostWrites)
	}
	if native.GCWrites != viaProtocol.GCWrites {
		t.Errorf("migration writes differ: in-process %d, remote %d", native.GCWrites, viaProtocol.GCWrites)
	}
	if native.TotalErases != viaProtocol.TotalErases {
		t.Errorf("erases differ: in-process %d, remote %d", native.TotalErases, viaProtocol.TotalErases)
	}
	if native.WriteAmplification != viaProtocol.WriteAmplification {
		t.Errorf("write amplification differs: in-process %v, remote %v",
			native.WriteAmplification, viaProtocol.WriteAmplification)
	}
}

// TestPrintingDoesNotCorruptTheProtocol covers the trap that would otherwise
// catch every competitor on their first debugging attempt.
func TestPrintingDoesNotCorruptTheProtocol(t *testing.T) {
	cfg := testConfig()
	policy := startRemote(t, "chatty", cfg, 0)

	result, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: testWorkload(), Policy: policy,
	})
	if err != nil {
		t.Fatalf("a solution that prints should still run cleanly, got: %v", err)
	}
	if !result.Passed {
		t.Fatal("expected the run to pass")
	}

	console := policy.Console()
	for _, want := range []string{
		"plain Println to stdout",
		"Printf with",
		"a direct write to os.Stdout",
		"the explicit Log helper",
	} {
		if !strings.Contains(console, want) {
			t.Errorf("console output is missing %q; got:\n%s", want, truncateForLog(console))
		}
	}
}

func TestOutOfRangeBlockIsReportedClearly(t *testing.T) {
	cfg := testConfig()

	_, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: testWorkload(),
		Policy: startRemote(t, "out-of-range", cfg, 0),
	})
	if err == nil {
		t.Fatal("expected an error when the solution names a block that does not exist")
	}
	if !strings.Contains(err.Error(), "9999") || !strings.Contains(err.Error(), "does not exist") {
		t.Errorf("error should name the bad index and say it does not exist, got: %v", err)
	}
}

func TestSolutionThatNeverStartsIsReportedClearly(t *testing.T) {
	cfg := testConfig()

	_, err := proto.StartHost(proto.HostConfig{
		Command: []string{os.Args[0]},
		Env:     []string{behaviourVar + "=crash"},
		Task:    proto.TaskVictimSelection,
		Config:  proto.Config{Blocks: cfg.Blocks, PagesPerBlock: cfg.PagesPerBlock},
	})
	if err == nil {
		t.Fatal("expected an error when the solution exits during the handshake")
	}
	if !strings.Contains(err.Error(), "exited before answering") {
		t.Errorf("error should say the solution exited, got: %v", err)
	}
}

func TestHangingSolutionTimesOut(t *testing.T) {
	cfg := testConfig()

	start := time.Now()
	_, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: testWorkload(),
		Policy: startRemote(t, "slow", cfg, 500*time.Millisecond),
	})
	elapsed := time.Since(start)

	if err == nil {
		t.Fatal("expected a timeout error from a solution that never answers")
	}
	if !strings.Contains(err.Error(), "did not answer") {
		t.Errorf("error should say the solution did not answer, got: %v", err)
	}
	if elapsed > 10*time.Second {
		t.Errorf("timeout took %s, which means it is not being enforced per request", elapsed)
	}
}

func truncateForLog(s string) string {
	if len(s) <= 400 {
		return s
	}
	return s[:400] + "..."
}
