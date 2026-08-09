import type { LanguageId } from "@/lib/languages";

/**
 * The signature a solution implements, per task and per language.
 *
 * These are what the `interface` block renders, and they re-render when the
 * language picker changes. That is the difference between a genuinely
 * language-agnostic problem statement and one language's documentation with
 * footnotes about the others.
 *
 * Each snippet shows the shape of the data as well as the signature, because
 * the first question after "what do I implement" is always "what am I given".
 */

export type TaskInterfaces = Readonly<Record<LanguageId, string>>;

export const VICTIM_SELECTION: TaskInterfaces = {
  GO: `type Stats struct {
    Blocks        []BlockStat // one entry per block
    PagesPerBlock int
    TotalErases   int
    FreePages     int
    ValidPages    int
    InvalidPages  int
}

type BlockStat struct {
    Index           int
    Valid           int // pages holding live data
    Invalid         int // pages holding superseded data
    Free            int // pages never written since the last erase
    EraseCount      int
    IsOverProvision bool
}

// Return the index of the block to reclaim.
func (Solution) SelectVictim(stats sdk.Stats) int`,

  PYTHON: `class Stats:
    blocks: list[BlockStat]
    pages_per_block: int
    total_erases: int
    free_pages: int
    valid_pages: int
    invalid_pages: int

class BlockStat:
    index: int
    valid: int             # pages holding live data
    invalid: int           # pages holding superseded data
    free: int              # pages never written since the last erase
    erase_count: int
    is_over_provision: bool

def select_victim(self, stats: ba.Stats) -> int:
    """Return the index of the block to reclaim."""`,

  C: `typedef struct {
    const ba_block *blocks;
    int block_count;
    int pages_per_block;
    int total_erases;
    int free_pages;
    int valid_pages;
    int invalid_pages;
} ba_stats;

typedef struct {
    int index;
    int valid;              /* pages holding live data */
    int invalid;            /* pages holding superseded data */
    int free;               /* pages never written since the last erase */
    int erase_count;
    int is_over_provision;
} ba_block;

/* Return the index of the block to reclaim. */
int select_victim(const ba_stats *stats, void *user);`,

  CPP: `struct Block {
    int index;
    int valid;               // pages holding live data
    int invalid;             // pages holding superseded data
    int free;                // pages never written since the last erase
    int erase_count;
    bool is_over_provision;
};

struct Stats {
    std::vector<Block> blocks;
    int pages_per_block;
    int total_erases;
    int free_pages;
    int valid_pages;
    int invalid_pages;
};

// Return the index of the block to reclaim.
int select_victim(const bytearena::Stats& stats) override;`,

  JAVA: `class Stats {
    List<Block> blocks;
    int pagesPerBlock;
    int totalErases;
    int freePages;
    int validPages;
    int invalidPages;
}

class Block {
    int index;
    int valid;               // pages holding live data
    int invalid;             // pages holding superseded data
    int free;                // pages never written since the last erase
    int eraseCount;
    boolean isOverProvision;
}

// Return the index of the block to reclaim.
public int selectVictim(ByteArena.Stats stats)`,

  RUST: `pub struct Stats {
    pub blocks: Vec<Block>,
    pub pages_per_block: i32,
    pub total_erases: i32,
    pub free_pages: i32,
    pub valid_pages: i32,
    pub invalid_pages: i32,
}

pub struct Block {
    pub index: i32,
    pub valid: i32,             // pages holding live data
    pub invalid: i32,           // pages holding superseded data
    pub free: i32,              // pages never written since the last erase
    pub erase_count: i32,
    pub is_over_provision: bool,
}

// Return the index of the block to reclaim.
fn select_victim(&mut self, stats: &Stats) -> i32`,
};

export const COMPACTION: TaskInterfaces = {
  GO: `// slots[i] is the value living in slot i, or -1 if the slot is empty.
// Return the moves that gather the live values into the front of the
// array, as {from, to} pairs applied in order.
func (Solution) Compact(slots []int) [][2]int`,

  PYTHON: `def compact(self, slots: list[int]) -> list[tuple[int, int]]:
    """slots[i] is the value living in slot i, or -1 if the slot is empty.

    Return the moves that gather the live values into the front of the
    array, as (from, to) pairs applied in order.
    """`,

  C: `/* slots[i] is the value living in slot i, or -1 if the slot is empty.
 * Call ba_emit_move once per move, in the order they should be applied. */
void compact(const int *slots, int slot_count, ba_emitter *out, void *user);

void ba_emit_move(ba_emitter *out, int from, int to);`,

  CPP: `// slots[i] is the value living in slot i, or -1 if the slot is empty.
// Return the moves that gather the live values into the front of the
// array, as {from, to} pairs applied in order.
std::vector<bytearena::Move> compact(const std::vector<int>& slots) override;`,

  JAVA: `// slots[i] is the value living in slot i, or -1 if the slot is empty.
// Return the moves that gather the live values into the front of the
// array, as Move(from, to) applied in order.
public List<ByteArena.Move> compact(int[] slots)`,

  RUST: `// slots[i] is the value living in slot i, or -1 if the slot is empty.
// Return the moves that gather the live values into the front of the
// array, as (from, to) pairs applied in order.
fn compact(&mut self, slots: &[i32]) -> Vec<(i32, i32)>`,
};

/** Every task this pack grades, mapped to its per-language signatures. */
export const SSD_INTERFACES: Readonly<Record<string, TaskInterfaces>> = {
  compaction: COMPACTION,
  "victim-selection": VICTIM_SELECTION,
  // The hard rung changes what is scored, not what is implemented.
  "wear-leveling": VICTIM_SELECTION,
};
