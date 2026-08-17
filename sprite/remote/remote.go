// Package remote adapts a solution running as a child process to the
// ftl.Policy interface the harness already expects.
//
// This is the seam that makes the platform language-agnostic. The harness is
// unchanged and still thinks it is calling a Go policy; underneath, every
// decision is a JSON round trip to a process that might be Python, C, Java or
// Rust. Keeping the adapter in its own package means the simulator never
// imports anything about processes, and the wire format never imports anything
// about flash memory.
package remote

import (
	"fmt"

	"github.com/bytearena/sprite/ftl"
	"github.com/bytearena/sprite/proto"
)

// Policy implements ftl.Policy by asking a child process which block to
// reclaim.
//
// The division of labour matches the one in the in-process contract: the
// solution picks the victim, and the migration of that block's live pages is
// mechanical work the host performs. Sending only an integer across the wire
// is what keeps every SDK small.
type Policy struct {
	host *proto.Host
}

// New wraps a started host.
func New(host *proto.Host) *Policy { return &Policy{host: host} }

// Name reports what the solution called itself at handshake time.
func (p *Policy) Name() string { return p.host.Name() }

// Console returns everything the solution wrote to stderr.
func (p *Policy) Console() string { return p.host.Console() }

// Close terminates the solution child process. The adversarial suite calls
// this after each scenario so a stateful solution never carries state from
// one scenario into the next.
func (p *Policy) Close() error { return p.host.Close() }

// Reclaim asks the solution for a victim block, validates the answer, migrates
// the block's live pages, and hands the index back to the harness to erase.
func (p *Policy) Reclaim(d *ftl.Device, stats ftl.DeviceStats) (int, error) {
	victim, err := p.host.Victim(toWireStats(stats))
	if err != nil {
		return 0, err
	}

	// Validate before touching the device. A bad index is the most common
	// mistake in a fresh SDK port, so the message names the legal range rather
	// than leaving the author to infer it.
	if victim < 0 || victim >= d.TotalBlockCount() {
		return 0, fmt.Errorf(
			"solution chose block %d, which does not exist (the device has blocks 0 to %d)",
			victim, d.TotalBlockCount()-1,
		)
	}

	for _, ppn := range d.ValidPagesIn(victim) {
		if err := d.MigratePage(ppn); err != nil {
			return 0, fmt.Errorf(
				"could not migrate live data out of block %d before erasing it: %w",
				victim, err,
			)
		}
	}

	return victim, nil
}

// toWireStats copies the simulator's view into the wire shape. The two structs
// are deliberately separate: the wire format is a published contract that
// solutions in six languages parse, so it must not shift every time the
// simulator grows an internal field.
func toWireStats(s ftl.DeviceStats) proto.Stats {
	blocks := make([]proto.BlockStat, len(s.Blocks))
	for i, b := range s.Blocks {
		blocks[i] = proto.BlockStat{
			Index:           b.Index,
			Valid:           b.Valid,
			Invalid:         b.Invalid,
			Free:            b.Free,
			EraseCount:      b.EraseCount,
			IsOverProvision: b.IsOverProvision,
		}
	}
	return proto.Stats{
		Blocks:        blocks,
		PagesPerBlock: s.PagesPerBlock,
		TotalErases:   s.TotalErases,
		FreePages:     s.FreePages,
		ValidPages:    s.ValidPages,
		InvalidPages:  s.InvalidPages,
	}
}
