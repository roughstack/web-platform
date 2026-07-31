// Package main is the runner that executes a user's FTL policy against a
// deterministic workload and emits a JSON result to stdout.
//
// The runner is compiled inside the Sprite Docker image together with the
// user's solution package (which must export a `New() ftl.Policy` function).
// The backend invokes the resulting binary with a workload seed and device
// geometry, reads the JSON from stdout, and stores it as the submission result.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/bytearena/sprite/ftl"
	"github.com/bytearena/sprite/solution"
)

func main() {
	var (
		seed          = flag.Int64("seed", 42, "workload seed for deterministic grading")
		operations    = flag.Int("operations", 1000, "number of write operations in the workload")
		blocks        = flag.Int("blocks", 32, "addressable blocks")
		pagesPerBlock = flag.Int("pages-per-block", 64, "pages per block")
		opBlocks      = flag.Int("op-blocks", 4, "over-provision blocks reserved for GC")
		logicalPages  = flag.Int("logical-pages", 1024, "logical address space size")
		hotFraction  = flag.Float64("hot-fraction", 0.2, "fraction of pages that are hot")
		hotProb       = flag.Float64("hot-probability", 0.8, "probability a write targets the hot set")
		timeoutSec    = flag.Int("timeout", 30, "maximum wall-clock seconds before the run is killed")
	)
	flag.Parse()

	// The timeout is enforced by the backend (which kills the container), but
	// we also track it here so the result JSON can report whether the policy
	// was slow even if it finished before the kill.
	deadline := time.Now().Add(time.Duration(*timeoutSec) * time.Second)

	policy := solution.New()

	deviceCfg := ftl.DeviceConfig{
		Blocks:             *blocks,
		PagesPerBlock:      *pagesPerBlock,
		OverProvisionBlocks: *opBlocks,
	}

	workload := ftl.GenerateWorkload(ftl.WorkloadConfig{
		Seed:          *seed,
		Operations:    *operations,
		LogicalPages:  *logicalPages,
		HotFraction:  *hotFraction,
		HotProbability: *hotProb,
	})

	start := time.Now()
	result, err := ftl.RunHarness(ftl.HarnessConfig{
		DeviceConfig: deviceCfg,
		Workload:     workload,
		Policy:       policy,
	})
	elapsed := time.Since(start)

	// Run the adversarial suite regardless of whether the main run passed.
	// A policy that passes the standard workload but fails fault injection
	// still fails overall.
	adversarial, _ := ftl.RunAdversarial(ftl.AdversarialConfig{
		DeviceConfig: deviceCfg,
		Policy:       policy,
		Seed:         *seed,
		Operations:   *operations,
	})

	output := map[string]any{
		"policy_name":          result.PolicyName,
		"operations":           result.Operations,
		"host_writes":          result.HostWrites,
		"gc_writes":            result.GCWrites,
		"total_erases":         result.TotalErases,
		"write_amplification":  result.WriteAmplification,
		"wear_spread":          result.WearSpread,
		"max_erase_count":      result.MaxEraseCount,
		"passed":               result.Passed && adversarial.Passed,
		"execution_time_ms":    elapsed.Milliseconds(),
		"timed_out":            time.Now().After(deadline),
		"final_state":          result.FinalState,
		"adversarial":          adversarial,
	}

	if err != nil {
		output["passed"] = false
		output["error"] = err.Error()
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(output); err != nil {
		fmt.Fprintf(os.Stderr, "failed to encode result: %v\n", err)
		os.Exit(1)
	}

	if err != nil {
		os.Exit(2)
	}
}
