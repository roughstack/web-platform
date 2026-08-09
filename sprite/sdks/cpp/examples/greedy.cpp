// The greedy baseline: reclaim whichever block has the most dead pages.
//
// This is the reference solution every real policy is measured against, and it
// is the same strategy implemented in each of the six SDKs so their results can
// be compared byte for byte.

#include "bytearena.hpp"

#include <string>

class Greedy : public bytearena::Solution {
public:
    std::string name() const override { return "greedy"; }

    int select_victim(const bytearena::Stats& stats) override {
        int best = -1, most_invalid = -1;
        for (const auto& block : stats.blocks) {
            if (block.invalid > most_invalid) {
                most_invalid = block.invalid;
                best = block.index;
            }
        }

        // Every block is either full of live data or already empty. Fall back
        // to the block holding the least live data, since that is the cheapest
        // one to evacuate.
        if (best < 0 || most_invalid == 0) {
            int fewest_valid = stats.pages_per_block + 1;
            for (const auto& block : stats.blocks) {
                if (block.is_over_provision) continue;
                if (block.valid > 0 && block.valid < fewest_valid) {
                    fewest_valid = block.valid;
                    best = block.index;
                }
            }
        }

        return best;
    }
};

int main() {
    Greedy greedy;
    return bytearena::run(greedy);
}
