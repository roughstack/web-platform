package ftl

import "testing"

func newTestDevice(t *testing.T) *Device {
	t.Helper()
	return NewDevice(Config{Blocks: 4, PagesPerBlock: 4})
}

func TestNewDeviceStartsEmpty(t *testing.T) {
	d := newTestDevice(t)

	if got, want := d.TotalPages(), 16; got != want {
		t.Fatalf("TotalPages() = %d, want %d", got, want)
	}
	if got, want := d.FreePages(), 16; got != want {
		t.Fatalf("FreePages() = %d, want %d", got, want)
	}
	if got := d.ValidPages(); got != 0 {
		t.Fatalf("ValidPages() = %d, want 0", got)
	}
	for i := range d.Blocks() {
		if got := d.EraseCount(i); got != 0 {
			t.Errorf("block %d EraseCount() = %d, want 0", i, got)
		}
	}
}

func TestWriteConsumesFreePageAndBecomesReadable(t *testing.T) {
	d := newTestDevice(t)

	if err := d.Write(7); err != nil {
		t.Fatalf("Write(7) returned error: %v", err)
	}

	if got, want := d.FreePages(), 15; got != want {
		t.Errorf("FreePages() = %d, want %d", got, want)
	}
	if got, want := d.ValidPages(), 1; got != want {
		t.Errorf("ValidPages() = %d, want %d", got, want)
	}
	if !d.Read(7) {
		t.Error("Read(7) = false, want true after writing LPN 7")
	}
}

func TestReadOfUnwrittenLogicalPageFails(t *testing.T) {
	d := newTestDevice(t)
	if d.Read(3) {
		t.Error("Read(3) = true, want false for a page that was never written")
	}
}

// Flash cannot overwrite in place. Rewriting a logical page must land on a new
// physical page and leave the previous one invalid, which is the entire reason
// garbage collection has to exist.
func TestRewriteInvalidatesPreviousPhysicalPage(t *testing.T) {
	d := newTestDevice(t)

	if err := d.Write(1); err != nil {
		t.Fatalf("first Write(1): %v", err)
	}
	first := d.PhysicalPageOf(1)

	if err := d.Write(1); err != nil {
		t.Fatalf("second Write(1): %v", err)
	}
	second := d.PhysicalPageOf(1)

	if first == second {
		t.Fatal("rewrite reused the same physical page; flash requires out-of-place update")
	}
	if got := d.InvalidPages(); got != 1 {
		t.Errorf("InvalidPages() = %d, want 1", got)
	}
	if got := d.ValidPages(); got != 1 {
		t.Errorf("ValidPages() = %d, want 1", got)
	}
	if !d.Read(1) {
		t.Error("Read(1) = false, want true; the logical page is still live")
	}
}

func TestHostWritesAreCounted(t *testing.T) {
	d := newTestDevice(t)
	for i := 0; i < 5; i++ {
		if err := d.Write(i); err != nil {
			t.Fatalf("Write(%d): %v", i, err)
		}
	}
	if got, want := d.HostWrites(), 5; got != want {
		t.Errorf("HostWrites() = %d, want %d", got, want)
	}
}

func TestWriteFailsWhenNoFreePagesRemain(t *testing.T) {
	d := NewDevice(Config{Blocks: 1, PagesPerBlock: 2})

	if err := d.Write(0); err != nil {
		t.Fatalf("Write(0): %v", err)
	}
	if err := d.Write(1); err != nil {
		t.Fatalf("Write(1): %v", err)
	}
	if err := d.Write(2); err == nil {
		t.Fatal("Write(2) succeeded on a full device, want ErrDeviceFull")
	} else if err != ErrDeviceFull {
		t.Fatalf("Write(2) error = %v, want ErrDeviceFull", err)
	}
}

func TestEraseResetsBlockAndIncrementsWear(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})

	// Fill block 0 then invalidate both of its pages by rewriting elsewhere.
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}
	if err := d.Write(1); err != nil {
		t.Fatal(err)
	}
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}
	if err := d.Write(1); err != nil {
		t.Fatal(err)
	}

	if err := d.Erase(0); err != nil {
		t.Fatalf("Erase(0): %v", err)
	}

	if got, want := d.EraseCount(0), 1; got != want {
		t.Errorf("EraseCount(0) = %d, want %d", got, want)
	}
	if got, want := d.BlockFreePages(0), 2; got != want {
		t.Errorf("BlockFreePages(0) = %d, want %d", got, want)
	}
	if got, want := d.TotalErases(), 1; got != want {
		t.Errorf("TotalErases() = %d, want %d", got, want)
	}
}

// Erasing a block that still holds live data would silently destroy it. The
// device refuses, forcing the caller to migrate valid pages first.
func TestEraseRefusesBlockHoldingValidPages(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}

	err := d.Erase(0)
	if err == nil {
		t.Fatal("Erase(0) succeeded while block held a valid page, want ErrBlockHasValidPages")
	}
	if err != ErrBlockHasValidPages {
		t.Fatalf("Erase(0) error = %v, want ErrBlockHasValidPages", err)
	}
	if !d.Read(0) {
		t.Error("data was lost even though the erase was rejected")
	}
}

func TestEraseRejectsOutOfRangeBlock(t *testing.T) {
	d := newTestDevice(t)
	for _, idx := range []int{-1, 4, 99} {
		if err := d.Erase(idx); err != ErrInvalidBlock {
			t.Errorf("Erase(%d) error = %v, want ErrInvalidBlock", idx, err)
		}
	}
}

func TestMigratePageMovesDataAndCountsAsGarbageCollectionWrite(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})
	if err := d.Write(9); err != nil {
		t.Fatal(err)
	}
	src := d.PhysicalPageOf(9)

	if err := d.MigratePage(src); err != nil {
		t.Fatalf("MigratePage(%d): %v", src, err)
	}

	if got := d.PhysicalPageOf(9); got == src {
		t.Error("migration left the logical page mapped to its old location")
	}
	if !d.Read(9) {
		t.Error("Read(9) = false, want true; migration must preserve the data")
	}
	if got, want := d.GCWrites(), 1; got != want {
		t.Errorf("GCWrites() = %d, want %d", got, want)
	}
	// Migration is internal bookkeeping, not traffic the host asked for.
	if got, want := d.HostWrites(), 1; got != want {
		t.Errorf("HostWrites() = %d, want %d", got, want)
	}
}

func TestMigratePageRejectsNonValidSource(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})
	if err := d.MigratePage(0); err != ErrPageNotValid {
		t.Errorf("MigratePage on a free page returned %v, want ErrPageNotValid", err)
	}
}

func TestWriteAmplificationReflectsMigrationOverhead(t *testing.T) {
	d := NewDevice(Config{Blocks: 4, PagesPerBlock: 4})

	// No garbage collection yet, so amplification is exactly 1.
	for i := 0; i < 4; i++ {
		if err := d.Write(i); err != nil {
			t.Fatal(err)
		}
	}
	if got := d.WriteAmplification(); got != 1.0 {
		t.Errorf("WriteAmplification() = %v, want 1.0 before any migration", got)
	}

	// Four host writes plus one migration is five physical writes for four
	// logical ones.
	src := d.PhysicalPageOf(0)
	if err := d.MigratePage(src); err != nil {
		t.Fatal(err)
	}
	if got, want := d.WriteAmplification(), 1.25; got != want {
		t.Errorf("WriteAmplification() = %v, want %v", got, want)
	}
}

func TestWriteAmplificationIsOneWhenNothingWasWritten(t *testing.T) {
	d := newTestDevice(t)
	if got := d.WriteAmplification(); got != 1.0 {
		t.Errorf("WriteAmplification() = %v on an untouched device, want 1.0", got)
	}
}

func TestStatsSnapshotMatchesDeviceState(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}

	stats := d.Stats()

	if got, want := len(stats.Blocks), 2; got != want {
		t.Fatalf("len(Stats().Blocks) = %d, want %d", got, want)
	}
	if got, want := stats.PagesPerBlock, 2; got != want {
		t.Errorf("Stats().PagesPerBlock = %d, want %d", got, want)
	}

	var valid, invalid, free int
	for _, b := range stats.Blocks {
		valid += b.Valid
		invalid += b.Invalid
		free += b.Free
	}
	if valid != 1 || invalid != 1 || free != 2 {
		t.Errorf("stats totals valid=%d invalid=%d free=%d, want 1/1/2", valid, invalid, free)
	}
}

// The snapshot handed to solution code must be a copy. If a solution mutates it,
// the real device must be unaffected.
func TestStatsSnapshotIsIsolatedFromDevice(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})
	if err := d.Write(0); err != nil {
		t.Fatal(err)
	}

	stats := d.Stats()
	stats.Blocks[0].Valid = 999
	stats.Blocks[0].EraseCount = 999

	fresh := d.Stats()
	if fresh.Blocks[0].Valid == 999 || fresh.Blocks[0].EraseCount == 999 {
		t.Error("mutating the stats snapshot changed device state; snapshot must be a copy")
	}
}

func TestWearSpreadIsZeroWhenErasesAreEven(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 1})
	if got := d.WearSpread(); got != 0 {
		t.Errorf("WearSpread() = %v on a fresh device, want 0", got)
	}
}

// Two blocks with erase counts of 1 and 0 have a mean of 0.5 and a population
// standard deviation of exactly 0.5, so the expected value is checked precisely
// rather than merely asserted to be positive.
func TestWearSpreadReflectsUnevenErasing(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 2})

	// Fill block 0, then rewrite both logical pages so they relocate to block 1
	// and block 0 is left entirely invalid.
	for _, lpn := range []int{0, 1, 0, 1} {
		if err := d.Write(lpn); err != nil {
			t.Fatalf("Write(%d): %v", lpn, err)
		}
	}
	if got := d.BlockValidPages(0); got != 0 {
		t.Fatalf("block 0 holds %d valid pages, want 0 before erasing", got)
	}
	if err := d.Erase(0); err != nil {
		t.Fatalf("Erase(0): %v", err)
	}

	if got, want := d.WearSpread(), 0.5; got != want {
		t.Errorf("WearSpread() = %v, want %v for erase counts of 1 and 0", got, want)
	}
	if got, want := d.MaxEraseCount(), 1; got != want {
		t.Errorf("MaxEraseCount() = %d, want %d", got, want)
	}
}

// Verify is the consistency oracle the fault-injection suite relies on, so it
// must actually pass on a device that has been exercised normally.
func TestVerifyPassesAfterNormalUse(t *testing.T) {
	d := NewDevice(Config{Blocks: 4, PagesPerBlock: 4})
	for i := 0; i < 12; i++ {
		if err := d.Write(i % 5); err != nil {
			t.Fatalf("Write: %v", err)
		}
	}
	if err := d.Verify(); err != nil {
		t.Errorf("Verify() = %v, want nil after ordinary writes", err)
	}
}

func TestVerifyPassesAfterMigrationAndErase(t *testing.T) {
	d := NewDevice(Config{Blocks: 4, PagesPerBlock: 2})
	for _, lpn := range []int{0, 1, 0, 1} {
		if err := d.Write(lpn); err != nil {
			t.Fatalf("Write(%d): %v", lpn, err)
		}
	}
	for _, ppn := range d.ValidPagesIn(1) {
		if err := d.MigratePage(ppn); err != nil {
			t.Fatalf("MigratePage(%d): %v", ppn, err)
		}
	}
	if err := d.Erase(1); err != nil {
		t.Fatalf("Erase(1): %v", err)
	}
	if err := d.Verify(); err != nil {
		t.Errorf("Verify() = %v, want nil after migrate and erase", err)
	}
	if !d.Read(0) || !d.Read(1) {
		t.Error("logical pages became unreadable after garbage collection")
	}
}

func TestValidPagesInListsOnlyLivePages(t *testing.T) {
	d := NewDevice(Config{Blocks: 2, PagesPerBlock: 4})
	// Three writes land in block 0; rewriting LPN 0 invalidates its first copy.
	for _, lpn := range []int{0, 1, 2, 0} {
		if err := d.Write(lpn); err != nil {
			t.Fatalf("Write(%d): %v", lpn, err)
		}
	}

	pages := d.ValidPagesIn(0)
	for _, ppn := range pages {
		if d.stateAt(ppn) != PageValid {
			t.Errorf("ValidPagesIn(0) returned ppn %d which is not valid", ppn)
		}
	}
	if got, want := len(pages), d.BlockValidPages(0); got != want {
		t.Errorf("ValidPagesIn(0) returned %d pages, want %d", got, want)
	}
}
