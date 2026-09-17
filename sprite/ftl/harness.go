package ftl

import (
	"errors"
	"fmt"
)

// ErrPolicyStalled is returned when a policy's Reclaim cannot free space and
// the run cannot continue.
var ErrPolicyStalled = errors.New("ftl: policy could not reclaim space")

// HarnessConfig describes a single graded run.
type HarnessConfig struct {
	DeviceConfig DeviceConfig
	Workload     []int
	Policy       Policy
	MaxReclaims  int
	// ReclaimThreshold is the free-page count at or below which the harness
	// triggers reclamation before the next write. It must be at least
	// PagesPerBlock so there is always room to migrate a full block's worth
	// of valid pages out of the victim before erasing it. If zero, it defaults
	// to PagesPerBlock.
	//
	// This is the high-watermark GC trigger used in real FTL firmware. Triggering
	// only when the device is completely full would leave no space to migrate
	// into, which is why naive "reclaim when full" loops deadlock.
	ReclaimThreshold int
}

// HarnessResult is the full output of a graded run, serialized to JSON by the
// runner and parsed by the backend.
type HarnessResult struct {
	PolicyName         string  `json:"policy_name"`
	Operations         int     `json:"operations"`
	HostWrites         int     `json:"host_writes"`
	GCWrites           int     `json:"gc_writes"`
	TotalErases        int     `json:"total_erases"`
	WriteAmplification float64 `json:"write_amplification"`
	WearSpread         float64 `json:"wear_spread"`
	MaxEraseCount      int     `json:"max_erase_count"`
	Passed             bool    `json:"passed"`
	Error              string  `json:"error,omitempty"`
	// FinalState is a snapshot of every block after the run, used by the
	// frontend to render the SSD block grid. Each entry has the block's
	// valid, invalid, free page counts and its erase count.
	FinalState []BlockStat `json:"final_state"`
}

// RunHarness replays a workload against a fresh device using the supplied
// policy. It returns the final metrics. If the policy stalls (cannot reclaim
// space when needed), the run fails with ErrPolicyStalled.
//
// The harness is deterministic: the same workload, device config and policy
// always produce the same result. This is what makes grading fair.
func RunHarness(cfg HarnessConfig) (HarnessResult, error) {
	if cfg.Policy == nil {
		return HarnessResult{}, errors.New("ftl: nil policy")
	}
	if len(cfg.Workload) == 0 {
		return HarnessResult{PolicyName: cfg.Policy.Name(), Passed: true}, nil
	}

	maxReclaims := cfg.MaxReclaims
	if maxReclaims <= 0 {
		// A generous default: one reclaim per write, plus headroom.
		maxReclaims = len(cfg.Workload) * 2
	}

	threshold := cfg.ReclaimThreshold
	if threshold <= 0 {
		// Keep at least one over-provision block's worth of free pages so
		// migration always has a destination. The OP blocks are exactly this
		// reserve; trigger before the reserve is exhausted.
		threshold = cfg.DeviceConfig.OverProvisionBlocks * cfg.DeviceConfig.PagesPerBlock
	}
	if threshold < cfg.DeviceConfig.PagesPerBlock {
		threshold = cfg.DeviceConfig.PagesPerBlock
	}

	d := NewDevice(cfg.DeviceConfig)
	reclaims := 0

	for _, lpn := range cfg.Workload {
		// Trigger reclamation while there is still enough free space to
		// migrate a full block's worth of valid pages out of the victim.
		// Waiting until the device is completely full would leave nowhere
		// to migrate into.
		if d.FreePages() <= threshold {
			block, err := cfg.Policy.Reclaim(d, d.Stats())
			if err != nil {
				return partialResult(d, cfg.Policy.Name()), fmt.Errorf(
					"policy %s stalled during reclaim: %w", cfg.Policy.Name(), err,
				)
			}
			if err := d.Erase(block); err != nil {
				return partialResult(d, cfg.Policy.Name()), fmt.Errorf(
					"policy %s chose block %d which cannot be erased: %w",
					cfg.Policy.Name(), block, err,
				)
			}
			reclaims++
			if reclaims > maxReclaims {
				return partialResult(d, cfg.Policy.Name()), ErrPolicyStalled
			}
		}

		if err := d.Write(lpn); err != nil {
			return partialResult(d, cfg.Policy.Name()), fmt.Errorf(
				"write failed after reclaim: %w", err,
			)
		}
	}

	if err := d.Verify(); err != nil {
		return partialResult(d, cfg.Policy.Name()), fmt.Errorf(
			"device consistency check failed: %w", err,
		)
	}

	result := partialResult(d, cfg.Policy.Name())
	result.Operations = len(cfg.Workload)
	result.Passed = true
	return result, nil
}

func partialResult(d *Device, name string) HarnessResult {
	return HarnessResult{
		PolicyName:         name,
		HostWrites:         d.HostWrites(),
		GCWrites:           d.GCWrites(),
		TotalErases:        d.TotalErases(),
		WriteAmplification: d.WriteAmplification(),
		WearSpread:         d.WearSpread(),
		MaxEraseCount:      d.MaxEraseCount(),
		FinalState:         d.Blocks(),
	}
}
