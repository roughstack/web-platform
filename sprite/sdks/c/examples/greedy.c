/* The greedy baseline: reclaim whichever block has the most dead pages.
 *
 * This is the reference solution every real policy is measured against, and it
 * is the same strategy implemented in each of the six SDKs so their results can
 * be compared byte for byte.
 */

#include "bytearena.h"

#include <string.h>

static int select_victim(const ba_stats *stats, void *user) {
    (void)user;

    int best = -1, most_invalid = -1;
    for (int i = 0; i < stats->block_count; i++) {
        if (stats->blocks[i].invalid > most_invalid) {
            most_invalid = stats->blocks[i].invalid;
            best = stats->blocks[i].index;
        }
    }

    /* Every block is either full of live data or already empty. Fall back to
     * the block holding the least live data, since that is the cheapest one to
     * evacuate. */
    if (best < 0 || most_invalid == 0) {
        int fewest_valid = stats->pages_per_block + 1;
        for (int i = 0; i < stats->block_count; i++) {
            const ba_block *b = &stats->blocks[i];
            if (b->is_over_provision) continue;
            if (b->valid > 0 && b->valid < fewest_valid) {
                fewest_valid = b->valid;
                best = b->index;
            }
        }
    }

    return best;
}

int main(void) {
    ba_solution solution;
    memset(&solution, 0, sizeof(solution));
    solution.name = "greedy";
    solution.select_victim = select_victim;
    return ba_run(solution);
}
