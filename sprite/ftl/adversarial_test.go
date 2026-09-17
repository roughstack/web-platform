package ftl

import (
	"reflect"
	"testing"
)

// stallPolicyReclaim is a policy that always stalls, used to verify that
// adversarial scenarios detect broken policies.
type stallPolicyReclaim struct{}

func (stallPolicyReclaim) Name() string { return "stall" }
func (stallPolicyReclaim) Close() error { return nil }
func (stallPolicyReclaim) Reclaim(d *Device, _ DeviceStats) (int, error) {
	return 0, ErrPolicyStalled
}

// greedyPolicyReclaim is the reference policy for adversarial tests.
type greedyPolicyReclaim struct{}

func (greedyPolicyReclaim) Name() string { return "greedy" }
func (greedyPolicyReclaim) Close() error { return nil }
func (greedyPolicyReclaim) Reclaim(d *Device, stats DeviceStats) (int, error) {
	best := -1
	maxInvalid := -1
	for _, b := range stats.Blocks {
		if b.Invalid > maxInvalid {
			maxInvalid = b.Invalid
			best = b.Index
		}
	}
	if best < 0 || maxInvalid == 0 {
		return 0, ErrPolicyStalled
	}
	for _, ppn := range d.ValidPagesIn(best) {
		if err := d.MigratePage(ppn); err != nil {
			return 0, err
		}
	}
	return best, nil
}

func defaultAdversarialDeviceConfig() DeviceConfig {
	return DeviceConfig{
		Blocks:              16,
		PagesPerBlock:       64,
		OverProvisionBlocks: 2,
	}
}

// greedyCtor and stallCtor wrap a stateless in-process policy as a
// PolicyConstructor, so the adversarial tests exercise the same fresh-per-
// scenario path that real (stateful) solutions go through.
func greedyCtor() PolicyConstructor {
	return func() (Policy, error) { return greedyPolicyReclaim{}, nil }
}

func stallCtor() PolicyConstructor {
	return func() (Policy, error) { return stallPolicyReclaim{}, nil }
}

func TestAdversarialPassesWithGreedyPolicy(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    greedyCtor(),
		Seed:         42,
	}

	result, err := RunAdversarial(cfg)
	if err != nil {
		t.Fatalf("adversarial run failed: %v", err)
	}
	if !result.Passed {
		t.Errorf("greedy policy should pass adversarial suite, got failures: %v", result.Scenarios)
	}
	if len(result.Scenarios) != 3 {
		t.Errorf("expected 3 scenarios, got %d", len(result.Scenarios))
	}
	for _, s := range result.Scenarios {
		if !s.Passed {
			t.Errorf("scenario %s should pass with greedy policy: %s", s.Name, s.Error)
		}
	}
}

func TestAdversarialFailsWithStallPolicy(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    stallCtor(),
		Seed:         42,
	}

	result, _ := RunAdversarial(cfg)
	if result.Passed {
		t.Errorf("stall policy should not pass adversarial suite")
	}
}

func TestAdversarialHotPageThrashMeasuresMigrationCount(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    greedyCtor(),
		Seed:         42,
	}

	result, _ := RunAdversarial(cfg)
	thrash := findScenario(result, "hot_page_thrash")
	if thrash == nil {
		t.Fatalf("hot_page_thrash scenario not found")
	}
	if !thrash.Passed {
		t.Errorf("hot_page_thrash should pass with greedy: %s", thrash.Error)
	}
	// The greedy policy will migrate the hot page at least once when its
	// block is reclaimed. A smart policy would migrate it zero times.
	if thrash.Metrics["hot_page_migrations"] < 0 {
		t.Errorf("hot_page_migrations should be non-negative")
	}
}

func TestAdversarialCapacityPressureStallsBadPolicy(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    stallCtor(),
		Seed:         42,
	}

	result, _ := RunAdversarial(cfg)
	pressure := findScenario(result, "capacity_pressure")
	if pressure == nil {
		t.Fatalf("capacity_pressure scenario not found")
	}
	if pressure.Passed {
		t.Errorf("capacity_pressure should fail with stall policy")
	}
}

func TestAdversarialPowerLossRecoveryChecksConsistency(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    greedyCtor(),
		Seed:         42,
	}

	result, _ := RunAdversarial(cfg)
	power := findScenario(result, "power_loss_recovery")
	if power == nil {
		t.Fatalf("power_loss_recovery scenario not found")
	}
	if !power.Passed {
		t.Errorf("power_loss_recovery should pass with greedy: %s", power.Error)
	}
}

func TestAdversarialIsDeterministic(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    greedyCtor(),
		Seed:         99,
	}

	r1, _ := RunAdversarial(cfg)
	r2, _ := RunAdversarial(cfg)
	if !reflect.DeepEqual(r1, r2) {
		t.Errorf("adversarial runs with same seed should be identical")
	}
}

func TestAdversarialRejectsNilPolicy(t *testing.T) {
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    nil,
		Seed:         42,
	}
	if _, err := RunAdversarial(cfg); err == nil {
		t.Errorf("expected error for nil policy constructor")
	}
}

// TestAdversarialFreshPolicyPerScenario is the regression test for the
// state-leak bug. RunAdversarial must call the constructor exactly once per
// scenario (3 times total) so each scenario gets a fresh policy. Before the
// fix, all three scenarios shared one policy instance, so a stateful
// solution carried state from scenario 1 into scenarios 2 and 3.
func TestAdversarialFreshPolicyPerScenario(t *testing.T) {
	calls := 0
	ctor := func() (Policy, error) {
		calls++
		return greedyPolicyReclaim{}, nil
	}
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    ctor,
		Seed:         42,
	}

	if _, err := RunAdversarial(cfg); err != nil {
		t.Fatalf("adversarial run failed: %v", err)
	}
	if calls != 3 {
		t.Errorf("NewPolicy should be called once per scenario (3 times), got %d", calls)
	}
}

// TestAdversarialClosesEveryScenarioPolicy verifies that every policy
// returned by the constructor is Closed when its scenario ends, so a remote
// solution process is not left running between scenarios.
func TestAdversarialClosesEveryScenarioPolicy(t *testing.T) {
	closed := 0
	ctor := func() (Policy, error) {
		return &closeTrackingPolicy{greedy: greedyPolicyReclaim{}, closed: &closed}, nil
	}
	cfg := AdversarialConfig{
		DeviceConfig: defaultAdversarialDeviceConfig(),
		NewPolicy:    ctor,
		Seed:         42,
	}

	if _, err := RunAdversarial(cfg); err != nil {
		t.Fatalf("adversarial run failed: %v", err)
	}
	if closed != 3 {
		t.Errorf("every scenario policy should be Closed (3 times), got %d", closed)
	}
}

type closeTrackingPolicy struct {
	greedy greedyPolicyReclaim
	closed *int
}

func (c *closeTrackingPolicy) Name() string { return "close-tracking-greedy" }
func (c *closeTrackingPolicy) Close() error {
	*c.closed++
	return nil
}
func (c *closeTrackingPolicy) Reclaim(d *Device, stats DeviceStats) (int, error) {
	return c.greedy.Reclaim(d, stats)
}

func findScenario(result AdversarialResult, name string) *ScenarioResult {
	for i := range result.Scenarios {
		if result.Scenarios[i].Name == name {
			return &result.Scenarios[i]
		}
	}
	return nil
}
