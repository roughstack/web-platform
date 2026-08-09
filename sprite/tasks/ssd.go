// The three rungs of the SSD ladder. Each teaches exactly one new idea and
// reuses everything below it:
//
//	compaction       moving data is not free
//	victim-selection space is only reclaimed a whole block at a time
//	wear-leveling    the cheapest block to reclaim is often the one you are
//	                 burning out
package tasks

import (
	"errors"
	"fmt"

	"github.com/bytearena/sprite/compaction"
	"github.com/bytearena/sprite/ftl"
	"github.com/bytearena/sprite/proto"
	"github.com/bytearena/sprite/remote"
	"github.com/bytearena/sprite/solution"
)

func init() {
	Register(compactionTask{})
	Register(victimSelectionTask{})
	Register(wearLevelingTask{})
}

// ------------------------------------------------------- rung 1: compaction

type compactionTask struct{}

func (compactionTask) Name() string     { return "compaction" }
func (compactionTask) Protocol() string { return proto.TaskCompaction }

func (compactionTask) Defaults(p Params) Params {
	if p.Slots <= 0 {
		p.Slots = 64
	}
	if p.LiveFraction <= 0 {
		p.LiveFraction = 0.55
	}
	return p
}

func (t compactionTask) Config(p Params) proto.Config {
	p = t.Defaults(p)
	return proto.Config{SlotCount: p.Slots}
}

func (t compactionTask) Run(host *proto.Host, p Params) Outcome {
	p = t.Defaults(p)

	slots := compaction.Generate(compaction.Config{
		Seed:         p.Seed,
		Slots:        p.Slots,
		LiveFraction: p.LiveFraction,
	})

	moves, err := host.Compact(slots)
	if err != nil {
		return failed(err, nil, compaction.Result{InitialSlots: slots})
	}

	result := compaction.Grade(slots, moves)

	metrics := map[string]float64{
		"moves":       float64(result.Moves),
		"optimal":     float64(result.Optimal),
		"efficiency":  result.Efficiency,
		"live_values": float64(result.LiveValues),
	}
	if !result.Passed {
		return failed(errors.New(result.Error), metrics, result)
	}

	return Outcome{
		Passed:  true,
		Metrics: metrics,
		Detail:  result,
		// Compaction is the one rung with a provable optimum, so the reference
		// is the optimum itself rather than a reference strategy's score.
		Baseline: map[string]float64{"moves": float64(result.Optimal)},
	}
}

// -------------------------------------------------- rung 2: victim selection

type victimSelectionTask struct{}

func (victimSelectionTask) Name() string     { return "victim-selection" }
func (victimSelectionTask) Protocol() string { return proto.TaskVictimSelection }

func (victimSelectionTask) Defaults(p Params) Params {
	return withDeviceDefaults(p)
}

func (t victimSelectionTask) Config(p Params) proto.Config {
	return deviceConfig(t.Defaults(p))
}

func (t victimSelectionTask) Run(host *proto.Host, p Params) Outcome {
	p = t.Defaults(p)

	result, err := runDevice(host, p)
	metrics := deviceMetrics(result)
	if err != nil {
		return failed(err, metrics, map[string]any{"final_state": result.FinalState})
	}

	return Outcome{
		Passed:   result.Passed,
		Metrics:  metrics,
		Detail:   map[string]any{"final_state": result.FinalState},
		Baseline: referenceMetrics(p),
	}
}

// ---------------------------------------------------- rung 3: wear levelling

type wearLevelingTask struct{}

func (wearLevelingTask) Name() string     { return "wear-leveling" }
func (wearLevelingTask) Protocol() string { return proto.TaskWearLeveling }

func (wearLevelingTask) Defaults(p Params) Params {
	p = withDeviceDefaults(p)
	// The top rung leans harder on skew, because hot and cold data landing in
	// the same block is what makes wear levelling and write amplification pull
	// against each other.
	if p.HotProbability <= 0 {
		p.HotProbability = 0.9
	}
	return p
}

func (t wearLevelingTask) Config(p Params) proto.Config {
	return deviceConfig(t.Defaults(p))
}

func (t wearLevelingTask) Run(host *proto.Host, p Params) Outcome {
	p = t.Defaults(p)

	policy := remote.New(host)
	cfg := ftl.DeviceConfig{
		Blocks:              p.Blocks,
		PagesPerBlock:       p.PagesPerBlock,
		OverProvisionBlocks: p.OverProvisionBlocks,
	}

	result, runErr := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: cfg,
		Workload:     workloadFor(p),
		Policy:       policy,
	})
	metrics := deviceMetrics(result)

	detail := map[string]any{"final_state": result.FinalState}

	if runErr != nil {
		return failed(runErr, metrics, detail)
	}

	// A policy that scores well on the standard workload but corrupts data
	// under fault injection has not solved the problem, so the suite runs even
	// when the main pass looked clean.
	adversarial, advErr := ftl.RunAdversarial(ftl.AdversarialConfig{
		DeviceConfig: cfg,
		Policy:       policy,
		Seed:         p.Seed,
		Operations:   p.Operations,
	})
	detail["adversarial"] = adversarial
	metrics["adversarial_passed"] = boolMetric(adversarial.Passed)

	if advErr != nil {
		return failed(fmt.Errorf("the fault-injection suite could not run: %w", advErr), metrics, detail)
	}
	if !adversarial.Passed {
		return failed(errors.New(firstFailure(adversarial)), metrics, detail)
	}

	return Outcome{
		Passed:   result.Passed,
		Metrics:  metrics,
		Detail:   detail,
		Baseline: referenceMetrics(p),
	}
}

// ------------------------------------------------------------------ shared

// referenceMetrics replays the same workload with the built-in greedy policy,
// giving the submission something to be measured against on its own instance.
//
// It roughly doubles the work of a run, which is a real cost paid on every
// submission. The alternative — a stored constant — is wrong on every geometry
// but the one it was measured on, and silently so. A run that is twice as slow
// but comparable is the better trade.
func referenceMetrics(p Params) map[string]float64 {
	result, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: ftl.DeviceConfig{
			Blocks:              p.Blocks,
			PagesPerBlock:       p.PagesPerBlock,
			OverProvisionBlocks: p.OverProvisionBlocks,
		},
		Workload: workloadFor(p),
		Policy:   solution.New(),
	})
	// A broken reference is our bug, not the author's. Omitting the baseline
	// leaves the run unscored rather than scored against nonsense.
	if err != nil || !result.Passed {
		return nil
	}
	return deviceMetrics(result)
}

func withDeviceDefaults(p Params) Params {
	if p.Blocks <= 0 {
		p.Blocks = 32
	}
	if p.PagesPerBlock <= 0 {
		p.PagesPerBlock = 64
	}
	if p.OverProvisionBlocks <= 0 {
		p.OverProvisionBlocks = 4
	}
	if p.LogicalPages <= 0 {
		p.LogicalPages = p.Blocks * p.PagesPerBlock / 2
	}
	if p.Operations <= 0 {
		p.Operations = 4000
	}
	if p.HotFraction <= 0 {
		p.HotFraction = 0.2
	}
	if p.HotProbability <= 0 {
		p.HotProbability = 0.8
	}
	return p
}

func deviceConfig(p Params) proto.Config {
	return proto.Config{
		Blocks:              p.Blocks,
		PagesPerBlock:       p.PagesPerBlock,
		OverProvisionBlocks: p.OverProvisionBlocks,
	}
}

func workloadFor(p Params) []int {
	return ftl.GenerateWorkload(ftl.WorkloadConfig{
		Seed:           p.Seed,
		Operations:     p.Operations,
		LogicalPages:   p.LogicalPages,
		HotFraction:    p.HotFraction,
		HotProbability: p.HotProbability,
	})
}

func runDevice(host *proto.Host, p Params) (ftl.HarnessResult, error) {
	return ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: ftl.DeviceConfig{
			Blocks:              p.Blocks,
			PagesPerBlock:       p.PagesPerBlock,
			OverProvisionBlocks: p.OverProvisionBlocks,
		},
		Workload: workloadFor(p),
		Policy:   remote.New(host),
	})
}

func deviceMetrics(r ftl.HarnessResult) map[string]float64 {
	return map[string]float64{
		"operations":          float64(r.Operations),
		"host_writes":         float64(r.HostWrites),
		"gc_writes":           float64(r.GCWrites),
		"total_erases":        float64(r.TotalErases),
		"write_amplification": r.WriteAmplification,
		"wear_spread":         r.WearSpread,
		"max_erase_count":     float64(r.MaxEraseCount),
	}
}

func boolMetric(b bool) float64 {
	if b {
		return 1
	}
	return 0
}

// firstFailure names the scenario that broke, so the author is told which fault
// their policy could not survive rather than just that one of them failed.
func firstFailure(r ftl.AdversarialResult) string {
	for _, scenario := range r.Scenarios {
		if !scenario.Passed {
			if scenario.Error != "" {
				return fmt.Sprintf("failed the %s scenario: %s", scenario.Name, scenario.Error)
			}
			return fmt.Sprintf("failed the %s scenario", scenario.Name)
		}
	}
	return "failed the fault-injection suite"
}
