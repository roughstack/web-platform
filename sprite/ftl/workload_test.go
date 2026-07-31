package ftl

import "testing"

func baseWorkload() WorkloadConfig {
	return WorkloadConfig{
		Seed:           42,
		Operations:     500,
		LogicalPages:   64,
		HotFraction:    0.2,
		HotProbability: 0.8,
	}
}

// Grading must be reproducible: the same seed has to produce byte-identical
// traffic, or two solutions cannot be compared to each other.
func TestWorkloadIsDeterministicForAGivenSeed(t *testing.T) {
	a := GenerateWorkload(baseWorkload())
	b := GenerateWorkload(baseWorkload())

	if len(a) != len(b) {
		t.Fatalf("lengths differ: %d vs %d", len(a), len(b))
	}
	for i := range a {
		if a[i] != b[i] {
			t.Fatalf("sequences diverge at index %d: %d vs %d", i, a[i], b[i])
		}
	}
}

func TestWorkloadDiffersBetweenSeeds(t *testing.T) {
	cfg := baseWorkload()
	a := GenerateWorkload(cfg)
	cfg.Seed = 43
	b := GenerateWorkload(cfg)

	identical := true
	for i := range a {
		if a[i] != b[i] {
			identical = false
			break
		}
	}
	if identical {
		t.Error("different seeds produced identical workloads")
	}
}

func TestWorkloadHasRequestedLength(t *testing.T) {
	cfg := baseWorkload()
	cfg.Operations = 137
	if got := len(GenerateWorkload(cfg)); got != 137 {
		t.Errorf("len(workload) = %d, want 137", got)
	}
}

func TestWorkloadStaysWithinAddressSpace(t *testing.T) {
	cfg := baseWorkload()
	for i, lpn := range GenerateWorkload(cfg) {
		if lpn < 0 || lpn >= cfg.LogicalPages {
			t.Fatalf("operation %d targets lpn %d, outside [0,%d)", i, lpn, cfg.LogicalPages)
		}
	}
}

// A skewed workload is what makes the challenge interesting: a policy that
// ignores the hot set will migrate cold data pointlessly.
func TestSkewedWorkloadConcentratesOnTheHotSet(t *testing.T) {
	cfg := baseWorkload()
	cfg.Operations = 10000
	cfg.HotFraction = 0.2
	cfg.HotProbability = 0.9

	hotLimit := int(float64(cfg.LogicalPages) * cfg.HotFraction)
	hits := 0
	for _, lpn := range GenerateWorkload(cfg) {
		if lpn < hotLimit {
			hits++
		}
	}

	ratio := float64(hits) / float64(cfg.Operations)
	if ratio < 0.85 || ratio > 0.95 {
		t.Errorf("hot set received %.1f%% of writes, want roughly 90%%", ratio*100)
	}
}

func TestUniformWorkloadSpreadsAcrossTheAddressSpace(t *testing.T) {
	cfg := baseWorkload()
	cfg.Operations = 10000
	cfg.HotProbability = 0 // no skew

	seen := make(map[int]int)
	for _, lpn := range GenerateWorkload(cfg) {
		seen[lpn]++
	}

	if got := len(seen); got < cfg.LogicalPages*9/10 {
		t.Errorf("only %d of %d logical pages were touched; distribution is not uniform",
			got, cfg.LogicalPages)
	}
}

func TestSequentialWorkloadWalksTheAddressSpaceInOrder(t *testing.T) {
	cfg := WorkloadConfig{
		Seed:         1,
		Operations:   10,
		LogicalPages: 4,
		Sequential:   true,
	}
	got := GenerateWorkload(cfg)
	want := []int{0, 1, 2, 3, 0, 1, 2, 3, 0, 1}

	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("sequential workload = %v, want %v", got, want)
		}
	}
}

func TestWorkloadHandlesDegenerateConfig(t *testing.T) {
	// Zero operations must not panic and must produce nothing.
	if got := GenerateWorkload(WorkloadConfig{Operations: 0, LogicalPages: 8}); len(got) != 0 {
		t.Errorf("len(workload) = %d for zero operations, want 0", len(got))
	}
	// A zero-page address space is clamped rather than dividing by zero.
	if got := GenerateWorkload(WorkloadConfig{Operations: 3, LogicalPages: 0}); len(got) != 3 {
		t.Errorf("len(workload) = %d, want 3", len(got))
	}
}
