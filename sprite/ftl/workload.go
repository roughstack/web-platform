package ftl

import "math/rand"

// WorkloadConfig describes the traffic a solution will be graded against.
//
// The generator is seeded and uses its own random source rather than the global
// one, so a given seed always produces byte-identical traffic. Grading depends on
// that: two solutions can only be compared if they faced the same workload.
type WorkloadConfig struct {
	Seed         int64
	Operations   int
	LogicalPages int

	// HotFraction is the share of the address space treated as hot, counted from
	// page zero. HotProbability is how often an operation targets that set.
	//
	// Skew is what gives the challenge its teeth. Under uniform traffic almost
	// any reclamation policy performs about the same; under skew, a policy that
	// keeps migrating cold data pays for it in write amplification.
	//
	// A HotProbability of zero or less disables skew and spreads traffic evenly
	// over the whole address space. It deliberately does not mean "send
	// everything to the cold set", so that a zero-value config produces the
	// neutral workload rather than a pathological inverse skew.
	HotFraction    float64
	HotProbability float64

	// Sequential replaces random access with a repeating ascending sweep, which
	// is the easy case and a useful baseline.
	Sequential bool
}

// GenerateWorkload produces the sequence of logical page writes to replay.
func GenerateWorkload(cfg WorkloadConfig) []int {
	if cfg.Operations <= 0 {
		return []int{}
	}
	if cfg.LogicalPages < 1 {
		cfg.LogicalPages = 1
	}

	ops := make([]int, cfg.Operations)

	if cfg.Sequential {
		for i := range ops {
			ops[i] = i % cfg.LogicalPages
		}
		return ops
	}

	rng := rand.New(rand.NewSource(cfg.Seed))

	if cfg.HotProbability <= 0 {
		for i := range ops {
			ops[i] = rng.Intn(cfg.LogicalPages)
		}
		return ops
	}

	hotPages := int(float64(cfg.LogicalPages) * cfg.HotFraction)
	if hotPages < 1 {
		hotPages = 1
	}
	if hotPages > cfg.LogicalPages {
		hotPages = cfg.LogicalPages
	}
	coldPages := cfg.LogicalPages - hotPages

	for i := range ops {
		if coldPages > 0 && rng.Float64() < cfg.HotProbability {
			ops[i] = rng.Intn(hotPages)
		} else if coldPages > 0 {
			ops[i] = hotPages + rng.Intn(coldPages)
		} else {
			ops[i] = rng.Intn(cfg.LogicalPages)
		}
	}

	return ops
}
