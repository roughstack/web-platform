// Package solution is the user's submission. This file is a placeholder that
// gets overwritten with the user's code at runtime. The runner imports this
// package and calls New() to get a fresh policy for each run.
//
// The default implementation is the greedy baseline: always reclaim the block
// with the most invalid pages. It is the reference solution every real policy
// is measured against.
package solution

import "github.com/roughstack/execution-runtime/ftl"

// Policy implements the ftl.Policy interface using greedy victim selection.
type Policy struct{}

func (Policy) Name() string { return "greedy" }

// Close is a no-op for the in-process reference policy. The adversarial suite
// calls it after each scenario; a real (remote) policy would tear down its
// child process here.
func (Policy) Close() error { return nil }

func (Policy) Reclaim(d *ftl.Device, stats ftl.DeviceStats) (int, error) {
	best := -1
	maxInvalid := -1
	for _, b := range stats.Blocks {
		if b.Invalid > maxInvalid {
			maxInvalid = b.Invalid
			best = b.Index
		}
	}

	if best < 0 || maxInvalid == 0 {
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
		return 0, ftl.ErrPolicyStalled
	}
	for _, ppn := range d.ValidPagesIn(best) {
		if err := d.MigratePage(ppn); err != nil {
			return 0, err
		}
	}
	return best, nil
}

// New returns a fresh policy for each run.
func New() ftl.Policy { return Policy{} }
