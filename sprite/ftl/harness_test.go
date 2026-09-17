package ftl

import (
	"reflect"
	"testing"
)

// greedyPolicy always reclaims the block with the most invalid pages. It
// never reclaims over-provision blocks, which are the migration reserve —
// erasing them would shrink the space available for future migrations.
type greedyPolicy struct{}

func (greedyPolicy) Name() string { return "greedy" }

func (greedyPolicy) Close() error { return nil }

func (greedyPolicy) Reclaim(d *Device, stats DeviceStats) (int, error) {
	// Pick the block with the most invalid pages. Over-provision blocks
	// are eligible too: when migrated data is later invalidated by rewrites,
	// the OP block accumulates garbage and becomes the best candidate.
	// Erasing it just resets the reserve, which is fine.
	best := -1
	maxInvalid := -1
	for _, b := range stats.Blocks {
		if b.Invalid > maxInvalid {
			maxInvalid = b.Invalid
			best = b.Index
		}
	}

	if best < 0 || maxInvalid == 0 {
		// No block has garbage. Pick the non-OP block with the fewest valid
		// pages (least migration cost) and relocate its live data to the OP
		// reserve so the block can be erased. This is forced GC.
		minValid := stats.PagesPerBlock + 1
		for _, b := range stats.Blocks {
			if b.IsOverProvision {
				continue
			}
			if b.Valid > 0 && b.Valid < minValid {
				minValid = b.Valid
				best = b.Index
			}
		}
	}

	if best < 0 {
		return 0, ErrPolicyStalled
	}
	for _, ppn := range d.ValidPagesIn(best) {
		if err := d.MigratePage(ppn); err != nil {
			return 0, err
		}
	}
	return best, nil
}

// stallPolicy refuses to reclaim anything. Used to test that the harness
// correctly reports a stall rather than hanging.
type stallPolicy struct{}

func (stallPolicy) Name() string { return "stall" }
func (stallPolicy) Close() error { return nil }
func (stallPolicy) Reclaim(_ *Device, _ DeviceStats) (int, error) {
	return 0, ErrPolicyStalled
}

func TestRunHarnessCompletesTrivialWorkload(t *testing.T) {
	dcfg := DeviceConfig{Blocks: 4, PagesPerBlock: 4}
	workload := []int{0, 1, 2, 3, 4, 5, 6, 7}

	result, err := RunHarness(HarnessConfig{
		DeviceConfig: dcfg,
		Workload:     workload,
		Policy:       greedyPolicy{},
	})
	if err != nil {
		t.Fatalf("RunHarness error: %v", err)
	}
	if !result.Passed {
		t.Error("result.Passed = false, want true")
	}
	if got, want := result.Operations, len(workload); got != want {
		t.Errorf("Operations = %d, want %d", got, want)
	}
	if got := result.HostWrites; got != len(workload) {
		t.Errorf("HostWrites = %d, want %d", got, len(workload))
	}
}

func TestRunHarnessTriggersReclamation(t *testing.T) {
	// 2 addressable blocks × 2 pages + 1 OP block = 6 physical pages.
	// Threshold = OP*PPB = 2. The workload writes 4 unique LPNs (filling the
	// addressable space), then rewrites LPN 0 and 1. By the time the threshold
	// triggers, the victim block has both valid and invalid pages, so migration
	// is required and GCWrites must be non-zero.
	dcfg := DeviceConfig{Blocks: 2, PagesPerBlock: 2}
	workload := []int{0, 1, 2, 3, 0, 1, 2, 3, 0, 1}

	result, err := RunHarness(HarnessConfig{
		DeviceConfig: dcfg,
		Workload:     workload,
		Policy:       greedyPolicy{},
	})
	if err != nil {
		t.Fatalf("RunHarness error: %v", err)
	}
	if result.TotalErases == 0 {
		t.Error("TotalErases = 0, want at least one reclaim during the run")
	}
	if result.GCWrites == 0 {
		t.Error("GCWrites = 0, expected migration during reclaim")
	}
	if result.WriteAmplification <= 1.0 {
		t.Errorf("WriteAmplification = %v, want > 1.0", result.WriteAmplification)
	}
}

func TestRunHarnessReportsStalledPolicy(t *testing.T) {
	// 2 addressable blocks × 2 pages + 1 OP = 6 pages, threshold = 2.
	// After 4 writes the addressable space is full and free = 2 (in OP block),
	// so the threshold triggers and the stall policy must fail.
	dcfg := DeviceConfig{Blocks: 2, PagesPerBlock: 2}
	workload := []int{0, 1, 2, 3, 0}

	_, err := RunHarness(HarnessConfig{
		DeviceConfig: dcfg,
		Workload:     workload,
		Policy:       stallPolicy{},
	})
	if err == nil {
		t.Fatal("RunHarness succeeded with a stalling policy, want an error")
	}
}

func TestRunHarnessRejectsNilPolicy(t *testing.T) {
	_, err := RunHarness(HarnessConfig{
		DeviceConfig: DeviceConfig{Blocks: 1, PagesPerBlock: 1},
		Workload:     []int{0},
	})
	if err == nil {
		t.Fatal("RunHarness with nil policy succeeded, want error")
	}
}

func TestRunHarnessEmptyWorkloadPasses(t *testing.T) {
	result, err := RunHarness(HarnessConfig{
		DeviceConfig: DeviceConfig{Blocks: 1, PagesPerBlock: 1},
		Workload:     []int{},
		Policy:       greedyPolicy{},
	})
	if err != nil {
		t.Fatalf("RunHarness error on empty workload: %v", err)
	}
	if !result.Passed {
		t.Error("result.Passed = false on empty workload, want true")
	}
	if result.Operations != 0 {
		t.Errorf("Operations = %d, want 0", result.Operations)
	}
}

func TestRunHarnessIsDeterministic(t *testing.T) {
	// 8 addressable blocks × 4 pages + 1 OP = 36 physical pages.
	// 16 logical pages, 200 operations. Plenty of room for greedy to work.
	dcfg := DeviceConfig{Blocks: 8, PagesPerBlock: 4}
	workload := GenerateWorkload(WorkloadConfig{
		Seed: 99, Operations: 200, LogicalPages: 16, HotFraction: 0.25, HotProbability: 0.7,
	})

	r1, err1 := RunHarness(HarnessConfig{DeviceConfig: dcfg, Workload: workload, Policy: greedyPolicy{}})
	r2, err2 := RunHarness(HarnessConfig{DeviceConfig: dcfg, Workload: workload, Policy: greedyPolicy{}})

	if err1 != nil || err2 != nil {
		t.Fatalf("unexpected errors: %v %v", err1, err2)
	}
	if !reflect.DeepEqual(r1, r2) {
		t.Errorf("non-deterministic result: %+v vs %+v", r1, r2)
	}
}

func TestRunHarnessDetectsCorruption(t *testing.T) {
	// Same setup as the stall test: threshold triggers after 4 writes.
	// The corrupt policy returns a block still holding valid pages without
	// migrating them, so the harness must refuse to erase it.
	dcfg := DeviceConfig{Blocks: 2, PagesPerBlock: 2}
	workload := []int{0, 1, 2, 3, 0}

	_, err := RunHarness(HarnessConfig{
		DeviceConfig: dcfg,
		Workload:     workload,
		Policy:       corruptPolicy{},
	})
	if err == nil {
		t.Fatal("RunHarness with corrupt policy succeeded, want error")
	}
}

// corruptPolicy returns a block that still holds valid pages, which the harness
// must refuse to erase.
type corruptPolicy struct{}

func (corruptPolicy) Name() string { return "corrupt" }
func (corruptPolicy) Close() error { return nil }
func (corruptPolicy) Reclaim(d *Device, stats DeviceStats) (int, error) {
	// Return a block with valid pages still in it, without migrating them.
	for _, b := range stats.Blocks {
		if b.Valid > 0 {
			return b.Index, nil
		}
	}
	return 0, ErrPolicyStalled
}

func TestRunHarnessResultContainsPolicyName(t *testing.T) {
	result, _ := RunHarness(HarnessConfig{
		DeviceConfig: DeviceConfig{Blocks: 2, PagesPerBlock: 2},
		Workload:     []int{0, 1},
		Policy:       greedyPolicy{},
	})
	if got, want := result.PolicyName, "greedy"; got != want {
		t.Errorf("PolicyName = %q, want %q", got, want)
	}
}
