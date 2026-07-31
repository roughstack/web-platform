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
}

// PolicyConstructor builds a fresh Policy for each run. The harness calls this
// once at the start so the policy can hold per-run state without leaking
// between submissions.
type PolicyConstructor func() Policy
