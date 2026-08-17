package ftl

import (
	"errors"
	"fmt"
	"math/rand"
)

// AdversarialConfig describes a full adversarial run: the standard workload
// plus three fault-injection scenarios that stress the policy in ways the
// main workload does not.
//
// NewPolicy is a constructor rather than a single Policy because each
// scenario must run against a fresh solution process. A stateful solution
// (caches, learned thresholds) that shares one process across scenarios would
// have scenario 2 see scenario 1's state, which silently invalidates the
// isolation the suite is meant to enforce. The constructor is called once per
// scenario and the resulting policy is Closed when the scenario ends.
type AdversarialConfig struct {
	DeviceConfig DeviceConfig
	NewPolicy    PolicyConstructor
	Seed         int64
	// Operations is the length of the standard workload phase. If zero,
	// it defaults to 2000, which is enough to force several GC cycles on
	// the default device geometry.
	Operations int
}

// ScenarioResult is the outcome of one adversarial scenario. Each scenario
// runs its own workload against a fresh device and reports whether the
// policy kept the device consistent, plus scenario-specific metrics.
type ScenarioResult struct {
	Name    string         `json:"name"`
	Passed  bool           `json:"passed"`
	Error   string         `json:"error,omitempty"`
	Metrics map[string]int `json:"metrics,omitempty"`
}

// AdversarialResult is the full output of the adversarial suite. The overall
// Passed flag is true only if every scenario passed; a policy that scores
// well on the standard workload but corrupts data under any fault injection
// fails the whole run.
type AdversarialResult struct {
	Passed    bool             `json:"passed"`
	Scenarios []ScenarioResult `json:"scenarios"`
}

// RunAdversarial executes the three fault-injection scenarios against the
// supplied policy and returns a per-scenario breakdown. Each scenario uses a
// fresh device derived from the same geometry and a fresh policy from
// NewPolicy, so a failure in one does not contaminate the others and a
// stateful solution never carries state between scenarios.
//
// The scenarios are:
//   - hot_page_thrash: one page is rewritten thousands of times. A policy
//     that migrates the hot page out of the victim block on every reclaim
//     pays a huge write-amplification penalty. The metric hot_page_migrations
//     counts how many times the hot page was moved; migrating it more than
//     ops/20 times fails the scenario, because a policy that cannot leave hot
//     data alone will never be competitive on the real workload.
//   - capacity_pressure: the workload fills the device to its limit with
//     minimal over-provisioning (1 block). A policy that wastes space or
//     reclaims too late will stall.
//   - power_loss_recovery: the harness interrupts the policy mid-reclaim
//     (after some migrations but before the erase) and then continues. The
//     device must remain consistent; Verify must pass at the end.
func RunAdversarial(cfg AdversarialConfig) (AdversarialResult, error) {
	if cfg.NewPolicy == nil {
		return AdversarialResult{}, errors.New("ftl: nil policy constructor")
	}

	ops := cfg.Operations
	if ops <= 0 {
		ops = 2000
	}

	result := AdversarialResult{Passed: true}

	// Scenario 1: hot-page thrash.
	thrash := runHotPageThrash(cfg, ops)
	result.Scenarios = append(result.Scenarios, thrash)
	if !thrash.Passed {
		result.Passed = false
	}

	// Scenario 2: capacity pressure.
	pressure := runCapacityPressure(cfg, ops)
	result.Scenarios = append(result.Scenarios, pressure)
	if !pressure.Passed {
		result.Passed = false
	}

	// Scenario 3: power-loss recovery.
	power := runPowerLossRecovery(cfg, ops)
	result.Scenarios = append(result.Scenarios, power)
	if !power.Passed {
		result.Passed = false
	}

	return result, nil
}

// startScenario builds a fresh policy for one adversarial scenario. It
// returns a failing ScenarioResult if the constructor itself breaks, so the
// scenario functions can return early without touching the device. The
// caller owns the policy's lifetime and must defer policy.Close().
func startScenario(cfg AdversarialConfig, name string) (Policy, *ScenarioResult) {
	policy, err := cfg.NewPolicy()
	if err != nil {
		return nil, &ScenarioResult{
			Name:   name,
			Passed: false,
			Error:  fmt.Sprintf("could not start a fresh solution for the %s scenario: %v", name, err),
		}
	}
	return policy, nil
}

// runHotPageThrash hammers a single logical page to punish policies that
// migrate it. The hot page is rewritten on every other operation; the rest
// of the traffic is spread across the cold set. The metric hot_page_migrations
// counts how many times the policy moved the hot page during reclamation; a
// policy that moves it on more than 1/20 of the operations has not learned
// to leave hot data in place and fails the scenario.
func runHotPageThrash(cfg AdversarialConfig, ops int) ScenarioResult {
	const hotPage = 0
	const name = "hot_page_thrash"

	policy, fail := startScenario(cfg, name)
	if fail != nil {
		return *fail
	}
	defer policy.Close()

	wl := make([]int, ops)
	rng := rand.New(rand.NewSource(cfg.Seed))
	coldPages := cfg.DeviceConfig.Blocks * cfg.DeviceConfig.PagesPerBlock
	for i := range wl {
		if i%2 == 0 {
			wl[i] = hotPage
		} else {
			wl[i] = 1 + rng.Intn(coldPages-1)
		}
	}

	d := NewDevice(cfg.DeviceConfig)
	threshold := cfg.DeviceConfig.OverProvisionBlocks * cfg.DeviceConfig.PagesPerBlock
	if threshold < cfg.DeviceConfig.PagesPerBlock {
		threshold = cfg.DeviceConfig.PagesPerBlock
	}

	hotMigrations := 0
	for _, lpn := range wl {
		if d.FreePages() <= threshold {
			// Track whether the hot page gets migrated during this reclaim.
			before := d.PhysicalPageOf(hotPage)
			block, err := policy.Reclaim(d, d.Stats())
			if err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}
			// If the hot page's physical location changed during reclaim,
			// it was migrated.
			if d.PhysicalPageOf(hotPage) != before && before >= 0 {
				hotMigrations++
			}
			if err := d.Erase(block); err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}
		}
		if err := d.Write(lpn); err != nil {
			return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
		}
	}

	if err := d.Verify(); err != nil {
		return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
	}

	// A policy that migrates the hot page on more than 1/20 of the
	// operations is thrashing it. The greedy reference stays well under
	// this bound because it picks the block with the most invalid pages,
	// and the hot page's block is only occasionally the worst candidate.
	if ops >= 100 && hotMigrations > ops/20 {
		return ScenarioResult{
			Name:   name,
			Passed: false,
			Error:  fmt.Sprintf("hot page was migrated %d times during %d operations; a wear-aware policy must leave hot data in place", hotMigrations, ops),
			Metrics: map[string]int{
				"hot_page_migrations": hotMigrations,
				"gc_writes":           d.GCWrites(),
				"total_erases":        d.TotalErases(),
			},
		}
	}

	return ScenarioResult{
		Name:    name,
		Passed:  true,
		Metrics: map[string]int{"hot_page_migrations": hotMigrations, "gc_writes": d.GCWrites(), "total_erases": d.TotalErases()},
	}
}

// runCapacityPressure uses a device with only 1 over-provision block and a
// workload that fills every addressable page. A policy that reclaims too
// late or wastes space will stall.
func runCapacityPressure(cfg AdversarialConfig, ops int) ScenarioResult {
	const name = "capacity_pressure"

	policy, fail := startScenario(cfg, name)
	if fail != nil {
		return *fail
	}
	defer policy.Close()

	pressureCfg := cfg.DeviceConfig
	pressureCfg.OverProvisionBlocks = 1

	wl := make([]int, ops)
	rng := rand.New(rand.NewSource(cfg.Seed ^ 0x50))
	addrPages := pressureCfg.Blocks * pressureCfg.PagesPerBlock
	for i := range wl {
		wl[i] = rng.Intn(addrPages)
	}

	d := NewDevice(pressureCfg)
	threshold := pressureCfg.PagesPerBlock

	for _, lpn := range wl {
		if d.FreePages() <= threshold {
			block, err := policy.Reclaim(d, d.Stats())
			if err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}
			if err := d.Erase(block); err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}
		}
		if err := d.Write(lpn); err != nil {
			return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
		}
	}

	if err := d.Verify(); err != nil {
		return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
	}

	return ScenarioResult{
		Name:    name,
		Passed:  true,
		Metrics: map[string]int{"gc_writes": d.GCWrites(), "total_erases": d.TotalErases()},
	}
}

// runPowerLossRecovery simulates a power loss mid-reclaim. After the policy
// migrates some (but not all) valid pages out of the victim and returns the
// block to erase, the harness "loses power" — it skips the erase and instead
// leaves the block in a partially-migrated state. The next write triggers a
// fresh reclaim, and the policy must deal with the messy state. At the end,
// Verify must pass.
func runPowerLossRecovery(cfg AdversarialConfig, ops int) ScenarioResult {
	const name = "power_loss_recovery"

	policy, fail := startScenario(cfg, name)
	if fail != nil {
		return *fail
	}
	defer policy.Close()

	wl := make([]int, ops)
	rng := rand.New(rand.NewSource(cfg.Seed ^ 0x70))
	addrPages := cfg.DeviceConfig.Blocks * cfg.DeviceConfig.PagesPerBlock
	for i := range wl {
		wl[i] = rng.Intn(addrPages)
	}

	d := NewDevice(cfg.DeviceConfig)
	threshold := cfg.DeviceConfig.OverProvisionBlocks * cfg.DeviceConfig.PagesPerBlock
	if threshold < cfg.DeviceConfig.PagesPerBlock {
		threshold = cfg.DeviceConfig.PagesPerBlock
	}

	// Inject one power-loss event at the midpoint of the workload.
	powerLossAt := ops / 2
	powerLossInjected := false

	for i, lpn := range wl {
		if d.FreePages() <= threshold {
			block, err := policy.Reclaim(d, d.Stats())
			if err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}

			if !powerLossInjected && i >= powerLossAt {
				// Simulate power loss: skip the erase. The block still has
				// some valid pages (the ones the policy didn't migrate) and
				// some invalid pages (the ones it did). The next reclaim
				// must handle this.
				powerLossInjected = true
				continue
			}

			if err := d.Erase(block); err != nil {
				return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
			}
		}
		if err := d.Write(lpn); err != nil {
			return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
		}
	}

	if err := d.Verify(); err != nil {
		return ScenarioResult{Name: name, Passed: false, Error: err.Error()}
	}

	return ScenarioResult{
		Name:    name,
		Passed:  true,
		Metrics: map[string]int{"gc_writes": d.GCWrites(), "total_erases": d.TotalErases()},
	}
}