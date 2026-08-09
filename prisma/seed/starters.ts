/**
 * Starter code, per task shape and per language.
 *
 * Two shapes cover the whole ladder: one that returns a list of moves, and one
 * that returns a block index. Written out rather than generated from a template
 * because starter code is the first thing anyone reads, and a generated stub
 * always looks like one.
 */

export const COMPACTION_STARTERS: Record<string, string> = {
  GO: `package main

import "github.com/bytearena/sprite/sdk"

type Solution struct{}

func (Solution) Name() string { return "my-compactor" }

// Compact returns the moves that gather the live values into the front of the
// array. slots[i] is the value living in slot i, or -1 if the slot is empty.
// Each move is {from, to}, and they are applied in order.
//
// Moving data costs something, so the fewer moves the better.
func (Solution) Compact(slots []int) [][2]int {
	moves := [][2]int{}

	// TODO: your strategy here.

	return moves
}

func main() { sdk.Run(Solution{}) }
`,

  PYTHON: `import bytearena as ba


class Solution(ba.Solution):
    name = "my-compactor"

    def compact(self, slots):
        """Return the moves that compact the array.

        slots[i] is the value living in slot i, or -1 if the slot is empty.
        Each move is a (from, to) pair, applied in order.

        Moving data costs something, so the fewer moves the better.
        """
        moves = []

        # TODO: your strategy here.

        return moves


ba.run(Solution())
`,

  C: `#include "bytearena.h"

#include <string.h>

/* slots[i] is the value living in slot i, or -1 if the slot is empty.
 * Call ba_emit_move(out, from, to) once per move, in the order they should be
 * applied. Moving data costs something, so the fewer moves the better. */
static void compact(const int *slots, int slot_count, ba_emitter *out, void *user) {
    (void)slots;
    (void)slot_count;
    (void)out;
    (void)user;

    /* TODO: your strategy here. */
}

int main(void) {
    ba_solution solution;
    memset(&solution, 0, sizeof(solution));
    solution.name = "my-compactor";
    solution.compact = compact;
    return ba_run(solution);
}
`,

  CPP: `#include "bytearena.hpp"

#include <string>
#include <vector>

class Solution : public bytearena::Solution {
public:
    std::string name() const override { return "my-compactor"; }

    // slots[i] is the value living in slot i, or -1 if the slot is empty.
    // Each move is {from, to}, applied in order. Moving data costs something,
    // so the fewer moves the better.
    std::vector<bytearena::Move> compact(const std::vector<int>& slots) override {
        std::vector<bytearena::Move> moves;

        // TODO: your strategy here.

        return moves;
    }
};

int main() {
    Solution solution;
    return bytearena::run(solution);
}
`,

  JAVA: `import java.util.ArrayList;
import java.util.List;

public class Solution extends ByteArena.Solution {

    @Override
    public String name() {
        return "my-compactor";
    }

    /**
     * slots[i] is the value living in slot i, or -1 if the slot is empty.
     * Each Move is applied in order. Moving data costs something, so the fewer
     * moves the better.
     */
    @Override
    public List<ByteArena.Move> compact(int[] slots) {
        List<ByteArena.Move> moves = new ArrayList<>();

        // TODO: your strategy here.

        return moves;
    }

    public static void main(String[] args) {
        ByteArena.run(new Solution());
    }
}
`,

  RUST: `mod bytearena;

use bytearena::Solution;

struct MySolution;

impl Solution for MySolution {
    fn name(&self) -> String {
        "my-compactor".to_string()
    }

    // slots[i] is the value living in slot i, or -1 if the slot is empty.
    // Each move is (from, to), applied in order. Moving data costs something,
    // so the fewer moves the better.
    fn compact(&mut self, slots: &[i32]) -> Vec<(i32, i32)> {
        let mut moves = Vec::new();

        let _ = slots;
        // TODO: your strategy here.

        moves
    }
}

fn main() {
    bytearena::run(MySolution);
}
`,
};

export const VICTIM_STARTERS: Record<string, string> = {
  GO: `package main

import "github.com/bytearena/sprite/sdk"

type Solution struct{}

func (Solution) Name() string { return "my-policy" }

// SelectVictim returns the index of the block to reclaim.
//
// The harness migrates that block's live pages elsewhere and then erases it,
// so every live page in your chosen block becomes an extra write.
func (Solution) SelectVictim(stats sdk.Stats) int {
	// A greedy baseline: reclaim whichever block has the most dead pages.
	best, mostInvalid := 0, -1
	for _, block := range stats.Blocks {
		if block.Invalid > mostInvalid {
			mostInvalid, best = block.Invalid, block.Index
		}
	}
	return best
}

func main() { sdk.Run(Solution{}) }
`,

  PYTHON: `import bytearena as ba


class Solution(ba.Solution):
    name = "my-policy"

    def select_victim(self, stats):
        """Return the index of the block to reclaim.

        The harness migrates that block's live pages elsewhere and then erases
        it, so every live page in your chosen block becomes an extra write.
        """
        # A greedy baseline: reclaim whichever block has the most dead pages.
        return max(stats.blocks, key=lambda block: block.invalid).index


ba.run(Solution())
`,

  C: `#include "bytearena.h"

#include <string.h>

/* Return the index of the block to reclaim.
 *
 * The harness migrates that block's live pages elsewhere and then erases it,
 * so every live page in your chosen block becomes an extra write. */
static int select_victim(const ba_stats *stats, void *user) {
    (void)user;

    /* A greedy baseline: reclaim whichever block has the most dead pages. */
    int best = 0, most_invalid = -1;
    for (int i = 0; i < stats->block_count; i++) {
        if (stats->blocks[i].invalid > most_invalid) {
            most_invalid = stats->blocks[i].invalid;
            best = stats->blocks[i].index;
        }
    }
    return best;
}

int main(void) {
    ba_solution solution;
    memset(&solution, 0, sizeof(solution));
    solution.name = "my-policy";
    solution.select_victim = select_victim;
    return ba_run(solution);
}
`,

  CPP: `#include "bytearena.hpp"

#include <string>

class Solution : public bytearena::Solution {
public:
    std::string name() const override { return "my-policy"; }

    // Return the index of the block to reclaim.
    //
    // The harness migrates that block's live pages elsewhere and then erases
    // it, so every live page in your chosen block becomes an extra write.
    int select_victim(const bytearena::Stats& stats) override {
        // A greedy baseline: reclaim whichever block has the most dead pages.
        int best = 0, most_invalid = -1;
        for (const auto& block : stats.blocks) {
            if (block.invalid > most_invalid) {
                most_invalid = block.invalid;
                best = block.index;
            }
        }
        return best;
    }
};

int main() {
    Solution solution;
    return bytearena::run(solution);
}
`,

  JAVA: `public class Solution extends ByteArena.Solution {

    @Override
    public String name() {
        return "my-policy";
    }

    /**
     * Returns the index of the block to reclaim.
     *
     * <p>The harness migrates that block's live pages elsewhere and then erases
     * it, so every live page in your chosen block becomes an extra write.
     */
    @Override
    public int selectVictim(ByteArena.Stats stats) {
        // A greedy baseline: reclaim whichever block has the most dead pages.
        int best = 0, mostInvalid = -1;
        for (ByteArena.Block block : stats.blocks) {
            if (block.invalid > mostInvalid) {
                mostInvalid = block.invalid;
                best = block.index;
            }
        }
        return best;
    }

    public static void main(String[] args) {
        ByteArena.run(new Solution());
    }
}
`,

  RUST: `mod bytearena;

use bytearena::{Solution, Stats};

struct MySolution;

impl Solution for MySolution {
    fn name(&self) -> String {
        "my-policy".to_string()
    }

    // Return the index of the block to reclaim.
    //
    // The harness migrates that block's live pages elsewhere and then erases
    // it, so every live page in your chosen block becomes an extra write.
    fn select_victim(&mut self, stats: &Stats) -> i32 {
        // A greedy baseline: reclaim whichever block has the most dead pages.
        let mut best = 0;
        let mut most_invalid = -1;
        for block in &stats.blocks {
            if block.invalid > most_invalid {
                most_invalid = block.invalid;
                best = block.index;
            }
        }
        best
    }
}

fn main() {
    bytearena::run(MySolution);
}
`,
};
