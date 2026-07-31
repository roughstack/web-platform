// Package ftl simulates the parts of a NAND flash device that make storage
// firmware hard: pages cannot be overwritten in place, space is only reclaimed by
// erasing a whole block, and every erase wears the block out a little more.
package ftl

import (
	"errors"
	"math"
)

// PageState is the lifecycle of a single physical page.
type PageState uint8

const (
	// PageFree has never been written since the last erase of its block.
	PageFree PageState = iota
	// PageValid holds the current contents of some logical page.
	PageValid
	// PageInvalid holds superseded data. The space is unusable until the whole
	// block is erased.
	PageInvalid
)

var (
	// ErrDeviceFull means no free physical page remains anywhere on the device.
	ErrDeviceFull = errors.New("ftl: device is full, no free page available")
	// ErrBlockHasValidPages means an erase was attempted on a block that still
	// holds live data. Migrate those pages first.
	ErrBlockHasValidPages = errors.New("ftl: block still holds valid pages")
	// ErrInvalidBlock means the block index is out of range.
	ErrInvalidBlock = errors.New("ftl: block index out of range")
	// ErrPageNotValid means a migration source is not a live page.
	ErrPageNotValid = errors.New("ftl: source page is not valid")
)

// DeviceConfig describes the geometry of the simulated device.
type DeviceConfig struct {
	Blocks        int
	PagesPerBlock int
	// OverProvisionBlocks are extra blocks beyond the addressable space that
	// are never written by the host but are available for garbage collection
	// to migrate valid pages into. Without over-provisioning, a completely
	// full device has nowhere to migrate to and reclamation deadlocks.
	//
	// Real SSDs reserve 7-28% of physical capacity this way. The default of 1
	// block is the minimum that makes GC always able to make progress.
	OverProvisionBlocks int
}

type block struct {
	pages      []PageState
	eraseCount int
}

// BlockStat is a read-only snapshot of one block, handed to solution code.
type BlockStat struct {
	Index           int  `json:"index"`
	Valid           int  `json:"valid"`
	Invalid         int  `json:"invalid"`
	Free            int  `json:"free"`
	EraseCount      int  `json:"eraseCount"`
	// IsOverProvision is true for blocks in the reserved region. Host writes
	// never land here; only GC migration uses them. A policy that reclaims an
	// OP block shrinks the migration reserve, which is usually a bad idea.
	IsOverProvision bool `json:"isOverProvision"`
}

// DeviceStats is the full read-only view a garbage collection policy gets to
// reason about. It is always a copy, so a solution cannot reach through it to
// mutate the device.
type DeviceStats struct {
	Blocks        []BlockStat
	PagesPerBlock int
	TotalErases   int
	FreePages     int
	ValidPages    int
	InvalidPages  int
}

// Device is a simulated flash device with an internal translation layer.
type Device struct {
	cfg    DeviceConfig
	blocks []block

	// Logical to physical mapping, and its inverse so that garbage collection
	// can discover which logical page a physical page belongs to.
	l2p map[int]int
	p2l map[int]int

	// Allocation cursor. Real firmware appends within a block rather than
	// hunting for gaps, so the cursor sweeps forward and wraps.
	cursor int

	hostWrites  int
	gcWrites    int
	totalErases int
}

// NewDevice builds an empty device. A geometry with non-positive dimensions is
// clamped to a single page so the simulator can never divide by zero.
// OverProvisionBlocks defaults to 1 if not set, which is the minimum needed
// for garbage collection to always have somewhere to migrate.
func NewDevice(cfg DeviceConfig) *Device {
	if cfg.Blocks < 1 {
		cfg.Blocks = 1
	}
	if cfg.PagesPerBlock < 1 {
		cfg.PagesPerBlock = 1
	}
	if cfg.OverProvisionBlocks < 1 {
		cfg.OverProvisionBlocks = 1
	}

	totalBlocks := cfg.Blocks + cfg.OverProvisionBlocks
	blocks := make([]block, totalBlocks)
	for i := range blocks {
		blocks[i] = block{pages: make([]PageState, cfg.PagesPerBlock)}
	}

	return &Device{
		cfg:    cfg,
		blocks: blocks,
		l2p:    make(map[int]int),
		p2l:    make(map[int]int),
	}
}

// --------------------------------------------------------------- geometry

// BlockCount returns the number of addressable blocks (excluding over-provision).
func (d *Device) BlockCount() int { return d.cfg.Blocks }

// TotalBlockCount returns all blocks including over-provision.
func (d *Device) TotalBlockCount() int { return d.cfg.Blocks + d.cfg.OverProvisionBlocks }

func (d *Device) PagesPerBlock() int { return d.cfg.PagesPerBlock }

// TotalPages includes over-provision blocks. This is the physical capacity.
func (d *Device) TotalPages() int { return d.TotalBlockCount() * d.cfg.PagesPerBlock }

// AddressablePages is the capacity available for host writes.
func (d *Device) AddressablePages() int { return d.cfg.Blocks * d.cfg.PagesPerBlock }

// isOverProvision reports whether a block index is in the over-provision region.
func (d *Device) isOverProvision(blockIdx int) bool {
	return blockIdx >= d.cfg.Blocks
}

func (d *Device) blockOf(ppn int) int { return ppn / d.cfg.PagesPerBlock }
func (d *Device) pageOf(ppn int) int  { return ppn % d.cfg.PagesPerBlock }

func (d *Device) stateAt(ppn int) PageState {
	return d.blocks[d.blockOf(ppn)].pages[d.pageOf(ppn)]
}

func (d *Device) setState(ppn int, s PageState) {
	d.blocks[d.blockOf(ppn)].pages[d.pageOf(ppn)] = s
}

// --------------------------------------------------------------- counting

func (d *Device) countPages(state PageState) int {
	n := 0
	for i := range d.blocks {
		for _, p := range d.blocks[i].pages {
			if p == state {
				n++
			}
		}
	}
	return n
}

func (d *Device) FreePages() int    { return d.countPages(PageFree) }
func (d *Device) ValidPages() int   { return d.countPages(PageValid) }
func (d *Device) InvalidPages() int { return d.countPages(PageInvalid) }

func (d *Device) countInBlock(idx int, state PageState) int {
	if idx < 0 || idx >= len(d.blocks) {
		return 0
	}
	n := 0
	for _, p := range d.blocks[idx].pages {
		if p == state {
			n++
		}
	}
	return n
}

func (d *Device) BlockFreePages(idx int) int    { return d.countInBlock(idx, PageFree) }
func (d *Device) BlockValidPages(idx int) int   { return d.countInBlock(idx, PageValid) }
func (d *Device) BlockInvalidPages(idx int) int { return d.countInBlock(idx, PageInvalid) }

// EraseCount reports how many program/erase cycles a block has endured.
func (d *Device) EraseCount(idx int) int {
	if idx < 0 || idx >= len(d.blocks) {
		return 0
	}
	return d.blocks[idx].eraseCount
}

func (d *Device) TotalErases() int { return d.totalErases }
func (d *Device) HostWrites() int  { return d.hostWrites }
func (d *Device) GCWrites() int    { return d.gcWrites }

// --------------------------------------------------------------- operations

// allocateHost finds the next free physical page for a host write. It
// allocates across all blocks including over-provision, because the OP
// reserve is enforced by the GC threshold (which triggers before the
// reserve is exhausted), not by restricting which blocks the host can
// write to. This is how real FTL works: the controller uses all physical
// blocks and the over-provisioning is the gap between physical capacity
// and the logical address space.
func (d *Device) allocateHost() (int, bool) {
	total := d.TotalPages()
	for i := 0; i < total; i++ {
		ppn := (d.cursor + i) % total
		if d.stateAt(ppn) == PageFree {
			d.cursor = (ppn + 1) % total
			return ppn, true
		}
	}
	return 0, false
}

// allocateMigration finds a free physical page for a GC migration. It can
// allocate anywhere except the source block, including the over-provision
// region, which is exactly what the OP blocks are for.
func (d *Device) allocateMigration(excludeBlock int) (int, bool) {
	total := d.TotalPages()
	for i := 0; i < total; i++ {
		ppn := (d.cursor + i) % total
		if d.blockOf(ppn) == excludeBlock {
			continue
		}
		if d.stateAt(ppn) == PageFree {
			d.cursor = (ppn + 1) % total
			return ppn, true
		}
	}
	return 0, false
}

// invalidate retires whatever physical page currently backs a logical page.
func (d *Device) invalidate(lpn int) {
	old, ok := d.l2p[lpn]
	if !ok {
		return
	}
	d.setState(old, PageInvalid)
	delete(d.p2l, old)
}

// Write performs a host write of a logical page. Because flash cannot be
// overwritten in place, this always consumes a fresh physical page and leaves the
// previous one invalid.
func (d *Device) Write(lpn int) error {
	ppn, ok := d.allocateHost()
	if !ok {
		return ErrDeviceFull
	}

	d.invalidate(lpn)

	d.setState(ppn, PageValid)
	d.l2p[lpn] = ppn
	d.p2l[ppn] = lpn
	d.hostWrites++
	return nil
}

// Read reports whether a logical page currently holds live data.
func (d *Device) Read(lpn int) bool {
	_, ok := d.l2p[lpn]
	return ok
}

// PhysicalPageOf returns the physical page backing a logical page, or -1.
func (d *Device) PhysicalPageOf(lpn int) int {
	if ppn, ok := d.l2p[lpn]; ok {
		return ppn
	}
	return -1
}

// LogicalPageAt returns the logical page stored at a physical page, or -1.
func (d *Device) LogicalPageAt(ppn int) int {
	if lpn, ok := d.p2l[ppn]; ok {
		return lpn
	}
	return -1
}

// MigratePage relocates a live page elsewhere so its block can be erased. This
// is the write amplification: physical traffic the host never asked for.
func (d *Device) MigratePage(srcPPN int) error {
	if srcPPN < 0 || srcPPN >= d.TotalPages() {
		return ErrPageNotValid
	}
	if d.stateAt(srcPPN) != PageValid {
		return ErrPageNotValid
	}

	lpn, ok := d.p2l[srcPPN]
	if !ok {
		return ErrPageNotValid
	}

	dst, ok := d.allocateMigration(d.blockOf(srcPPN))
	if !ok {
		return ErrDeviceFull
	}

	d.setState(srcPPN, PageInvalid)
	delete(d.p2l, srcPPN)

	d.setState(dst, PageValid)
	d.l2p[lpn] = dst
	d.p2l[dst] = lpn
	d.gcWrites++
	return nil
}

// ValidPagesIn lists the physical pages in a block that still hold live data.
func (d *Device) ValidPagesIn(idx int) []int {
	if idx < 0 || idx >= len(d.blocks) {
		return nil
	}
	var pages []int
	base := idx * d.cfg.PagesPerBlock
	for i, state := range d.blocks[idx].pages {
		if state == PageValid {
			pages = append(pages, base+i)
		}
	}
	return pages
}

// Erase reclaims a whole block. It refuses to run while the block still holds
// live data, because doing so would silently destroy it.
func (d *Device) Erase(idx int) error {
	if idx < 0 || idx >= len(d.blocks) {
		return ErrInvalidBlock
	}
	if d.countInBlock(idx, PageValid) > 0 {
		return ErrBlockHasValidPages
	}

	base := idx * d.cfg.PagesPerBlock
	for i := range d.blocks[idx].pages {
		d.blocks[idx].pages[i] = PageFree
		delete(d.p2l, base+i)
	}
	d.blocks[idx].eraseCount++
	d.totalErases++
	return nil
}

// --------------------------------------------------------------- metrics

// WriteAmplification is total physical writes divided by the host writes that
// caused them. 1.0 is perfect; higher means the device is doing extra work.
func (d *Device) WriteAmplification() float64 {
	if d.hostWrites == 0 {
		return 1.0
	}
	return float64(d.hostWrites+d.gcWrites) / float64(d.hostWrites)
}

// WearSpread is the population standard deviation of per-block erase counts.
// Low means wear is being levelled across the device; high means some blocks are
// being burned out while others sit idle.
func (d *Device) WearSpread() float64 {
	n := len(d.blocks)
	if n == 0 {
		return 0
	}

	var sum float64
	for i := range d.blocks {
		sum += float64(d.blocks[i].eraseCount)
	}
	mean := sum / float64(n)

	var variance float64
	for i := range d.blocks {
		diff := float64(d.blocks[i].eraseCount) - mean
		variance += diff * diff
	}
	return math.Sqrt(variance / float64(n))
}

// MaxEraseCount is the wear on the most-used block, which is what actually
// determines when the device dies.
func (d *Device) MaxEraseCount() int {
	max := 0
	for i := range d.blocks {
		if d.blocks[i].eraseCount > max {
			max = d.blocks[i].eraseCount
		}
	}
	return max
}

// Blocks returns a snapshot of every block.
func (d *Device) Blocks() []BlockStat {
	stats := make([]BlockStat, len(d.blocks))
	for i := range d.blocks {
		stats[i] = BlockStat{
			Index:           i,
			Valid:           d.countInBlock(i, PageValid),
			Invalid:         d.countInBlock(i, PageInvalid),
			Free:            d.countInBlock(i, PageFree),
			EraseCount:      d.blocks[i].eraseCount,
			IsOverProvision: d.isOverProvision(i),
		}
	}
	return stats
}

// Stats returns the read-only view handed to solution code. Everything in it is
// a copy, so a solution mutating the snapshot cannot corrupt the device.
func (d *Device) Stats() DeviceStats {
	return DeviceStats{
		Blocks:        d.Blocks(),
		PagesPerBlock: d.cfg.PagesPerBlock,
		TotalErases:   d.totalErases,
		FreePages:     d.FreePages(),
		ValidPages:    d.ValidPages(),
		InvalidPages:  d.InvalidPages(),
	}
}

// Verify checks the invariants that must hold after any sequence of operations.
// It is the consistency oracle used by the fault-injection suite: if a solution
// leaves the device in a state that violates these, the data is corrupt no
// matter how good its metrics look.
func (d *Device) Verify() error {
	for lpn, ppn := range d.l2p {
		if ppn < 0 || ppn >= d.TotalPages() {
			return errors.New("ftl: mapping points outside the device")
		}
		if d.stateAt(ppn) != PageValid {
			return errors.New("ftl: a live logical page maps to a page that is not valid")
		}
		if back, ok := d.p2l[ppn]; !ok || back != lpn {
			return errors.New("ftl: forward and reverse mappings disagree")
		}
	}

	if got, want := len(d.p2l), d.ValidPages(); got != want {
		return errors.New("ftl: reverse map size does not match the number of valid pages")
	}
	return nil
}
