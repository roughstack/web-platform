//! The greedy baseline: reclaim whichever block has the most dead pages.
//!
//! This is the reference solution every real policy is measured against, and it
//! is the same strategy implemented in each of the six SDKs so their results can
//! be compared byte for byte.

#[path = "../bytearena.rs"]
mod bytearena;

use bytearena::{Solution, Stats};

struct Greedy;

impl Solution for Greedy {
    fn name(&self) -> String {
        "greedy".to_string()
    }

    fn select_victim(&mut self, stats: &Stats) -> i32 {
        let mut best = -1;
        let mut most_invalid = -1;
        for block in &stats.blocks {
            if block.invalid > most_invalid {
                most_invalid = block.invalid;
                best = block.index;
            }
        }

        // Every block is either full of live data or already empty. Fall back
        // to the block holding the least live data, since that is the cheapest
        // one to evacuate.
        if best < 0 || most_invalid == 0 {
            let mut fewest_valid = stats.pages_per_block + 1;
            for block in &stats.blocks {
                if block.is_over_provision {
                    continue;
                }
                if block.valid > 0 && block.valid < fewest_valid {
                    fewest_valid = block.valid;
                    best = block.index;
                }
            }
        }

        best
    }
}

fn main() {
    bytearena::run(Greedy);
}
