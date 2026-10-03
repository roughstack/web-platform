// Package conformance_test proves that the same strategy, written in each
// supported language, produces the same result.
//
// This is the test that makes the multi-language promise real. Every SDK ships
// a "greedy" reference solution implementing identical logic. Each one is run
// against the same device geometry and the same workload, and every metric must
// match the in-process Go policy exactly. If a port drifts - an off-by-one in a
// hand-written JSON parser, a signed/unsigned mistake, a locale-dependent
// number format - it shows up here as a diff rather than as a competitor
// wondering why the same algorithm scores differently in C than in Python.
//
// A language whose toolchain is absent is skipped, so the suite stays useful on
// a developer laptop. The Sprite image has all six, so CI covers them all.
package conformance_test

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/roughstack/execution-runtime/ftl"
	"github.com/roughstack/execution-runtime/proto"
	"github.com/roughstack/execution-runtime/remote"
	"github.com/roughstack/execution-runtime/solution"
)

// language describes how to turn one SDK's reference solution into a runnable
// command. prepare may compile into workDir and returns the argv to execute.
type language struct {
	name string
	// tool must be on PATH for this language to be exercised.
	tool    string
	prepare func(t *testing.T, sdkDir, workDir string) (argv []string, env []string)
}

func languages() []language {
	return []language{
		{
			name: "python",
			tool: "python3",
			prepare: func(t *testing.T, sdkDir, workDir string) ([]string, []string) {
				return []string{"python3", filepath.Join(sdkDir, "python", "examples", "greedy.py")},
					[]string{
						"PYTHONPATH=" + filepath.Join(sdkDir, "python"),
						// Buffered stdout would deadlock the conversation, since
						// the host waits for a reply before sending more work.
						"PYTHONUNBUFFERED=1",
						"PATH=" + os.Getenv("PATH"),
					}
			},
		},
		{
			name: "c",
			tool: "cc",
			prepare: func(t *testing.T, sdkDir, workDir string) ([]string, []string) {
				dir := filepath.Join(sdkDir, "c")
				bin := filepath.Join(workDir, "solution")
				build(t, workDir, "cc",
					"-std=c11", "-O2", "-I", dir, "-o", bin,
					filepath.Join(dir, "bytearena.c"),
					filepath.Join(dir, "examples", "greedy.c"),
				)
				return []string{bin}, nil
			},
		},
		{
			name: "cpp",
			tool: "c++",
			prepare: func(t *testing.T, sdkDir, workDir string) ([]string, []string) {
				cDir := filepath.Join(sdkDir, "c")
				cppDir := filepath.Join(sdkDir, "cpp")
				bin := filepath.Join(workDir, "solution")
				// The C++ binding wraps the C one, so both translation units go
				// in and there is only ever one JSON parser to keep correct.
				build(t, workDir, "c++",
					"-std=c++17", "-O2", "-I", cDir, "-I", cppDir, "-o", bin,
					filepath.Join(cDir, "bytearena.c"),
					filepath.Join(cppDir, "examples", "greedy.cpp"),
				)
				return []string{bin}, nil
			},
		},
		{
			name: "java",
			tool: "javac",
			prepare: func(t *testing.T, sdkDir, workDir string) ([]string, []string) {
				dir := filepath.Join(sdkDir, "java")
				build(t, workDir, "javac",
					"-d", workDir,
					filepath.Join(dir, "ByteArena.java"),
					filepath.Join(dir, "examples", "Greedy.java"),
				)
				return []string{"java", "-cp", workDir, "Greedy"},
					[]string{"PATH=" + os.Getenv("PATH"), "HOME=" + workDir}
			},
		},
		{
			name: "rust",
			tool: "rustc",
			prepare: func(t *testing.T, sdkDir, workDir string) ([]string, []string) {
				bin := filepath.Join(workDir, "solution")
				build(t, workDir, "rustc",
					"--edition", "2021", "-O", "-o", bin,
					filepath.Join(sdkDir, "rust", "examples", "greedy.rs"),
				)
				return []string{bin}, nil
			},
		},
	}
}

// build compiles a solution, failing the test with the compiler's own output
// rather than a bare exit code.
func build(t *testing.T, workDir, tool string, args ...string) {
	t.Helper()
	cmd := exec.Command(tool, args...)
	cmd.Dir = workDir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("compiling with %s failed: %v\n%s", tool, err, out)
	}
}

func sdkRoot(t *testing.T) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot locate the test source to find the SDK directory")
	}
	return filepath.Join(filepath.Dir(thisFile), "..", "sdks")
}

func deviceConfig() ftl.DeviceConfig {
	return ftl.DeviceConfig{Blocks: 8, PagesPerBlock: 16, OverProvisionBlocks: 2}
}

func workload() []int {
	return ftl.GenerateWorkload(ftl.WorkloadConfig{
		Seed: 42, Operations: 600, LogicalPages: 96,
		HotFraction: 0.2, HotProbability: 0.8,
	})
}

func TestEverySDKMatchesTheGoReference(t *testing.T) {
	cfg, load := deviceConfig(), workload()

	want, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg, Workload: load, Policy: solution.New(),
	})
	if err != nil {
		t.Fatalf("the in-process reference run failed: %v", err)
	}

	root := sdkRoot(t)

	for _, lang := range languages() {
		t.Run(lang.name, func(t *testing.T) {
			if _, err := exec.LookPath(lang.tool); err != nil {
				t.Skipf("%s is not installed on this machine", lang.tool)
			}

			workDir := t.TempDir()
			argv, env := lang.prepare(t, root, workDir)

			host, err := proto.StartHost(proto.HostConfig{
				Command: argv,
				Dir:     workDir,
				Env:     env,
				Task:    proto.TaskVictimSelection,
				Config: proto.Config{
					Blocks:              cfg.Blocks,
					PagesPerBlock:       cfg.PagesPerBlock,
					OverProvisionBlocks: cfg.OverProvisionBlocks,
				},
			})
			if err != nil {
				t.Fatalf("starting the %s solution: %v", lang.name, err)
			}
			policy := remote.New(host)
			defer host.Close()

			got, err := ftl.RunHarness(ftl.HarnessConfig{
				DeviceConfig: cfg, Workload: load, Policy: policy,
			})
			if err != nil {
				t.Fatalf("%s run failed: %v\nconsole output:\n%s", lang.name, err, policy.Console())
			}

			if !got.Passed {
				t.Fatalf("%s run did not pass\nconsole output:\n%s", lang.name, policy.Console())
			}
			if name := policy.Name(); name != "greedy" {
				t.Errorf("solution identified itself as %q, expected %q", name, "greedy")
			}
			assertSame(t, lang.name, want, got)
		})
	}
}

func assertSame(t *testing.T, lang string, want, got ftl.HarnessResult) {
	t.Helper()

	checks := []struct {
		metric string
		want   any
		got    any
	}{
		{"host writes", want.HostWrites, got.HostWrites},
		{"migration writes", want.GCWrites, got.GCWrites},
		{"erases", want.TotalErases, got.TotalErases},
		{"write amplification", want.WriteAmplification, got.WriteAmplification},
		{"wear spread", want.WearSpread, got.WearSpread},
		{"max erase count", want.MaxEraseCount, got.MaxEraseCount},
	}

	for _, c := range checks {
		if c.want != c.got {
			t.Errorf("%s: %s is %v, but the Go reference gets %v", lang, c.metric, c.got, c.want)
		}
	}
}
