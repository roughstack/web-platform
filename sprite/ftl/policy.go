package ftl

// Policy is the interface a user's solution implements.
//
// The harness owns the Device and the Workload. It replays the workload one
// write at a time. Before each write, if the device has no free page, it calls
// Reclaim to ask the policy which block to reclaim space from. The policy must
// migrate any valid pages out of that block (using MigratePage), after which
// the harness erases it. The write then proceeds.
//
// This split is deliberate: the policy decides WHICH block to reclaim and
// moves the live data; the harness performs the erase and the host write. That
// keeps the policy's responsibility exactly the victim-selection and
// data-migration logic that real FTL firmware owns, and nothing else.
type Policy interface {
	// Name returns a short identifier for the policy, included in results.
	Name() string

	// Reclaim is called when the device is full and space must be reclaimed
	// before the next write can proceed.
	//
	// The policy receives a read-only snapshot of device state and the device
	// itself (so it can call MigratePage). It must:
	//   1. Choose a block to reclaim.
	//   2. Migrate every valid page in that block elsewhere.
	//   3. Return the block index so the harness can erase it.
	//
	// If the policy cannot make progress it returns an error, and the run fails.
	Reclaim(d *Device, stats DeviceStats) (blockToErase int, err error)

	// Close releases any resources held by the policy. For an in-process
	// policy it is a no-op; for a remote policy it terminates the solution
	// child process. The adversarial suite calls NewPolicy once per scenario
	// and Close when the scenario ends, so a stateful solution never carries
	// state from one scenario into the next.
	Close() error
}

// PolicyConstructor builds a fresh Policy for each run. The harness calls this
// once at the start so the policy can hold per-run state without leaking
// between submissions. The adversarial suite calls it once per scenario so
// each scenario gets a clean solution process.
type PolicyConstructor func() (Policy, error)
