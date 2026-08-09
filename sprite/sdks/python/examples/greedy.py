"""The greedy baseline: reclaim whichever block has the most dead pages.

This is the reference solution every real policy is measured against, and it is
the same strategy implemented in each of the six SDKs so their results can be
compared byte for byte.
"""

import bytearena as ba


class Greedy(ba.Solution):
    name = "greedy"

    def select_victim(self, stats: ba.Stats) -> int:
        best, most_invalid = -1, -1
        for block in stats.blocks:
            if block.invalid > most_invalid:
                most_invalid, best = block.invalid, block.index

        # Every block is either full of live data or already empty. Fall back
        # to the block holding the least live data, since that is the cheapest
        # one to evacuate.
        if best < 0 or most_invalid == 0:
            fewest_valid = stats.pages_per_block + 1
            for block in stats.blocks:
                if block.is_over_provision:
                    continue
                if 0 < block.valid < fewest_valid:
                    fewest_valid, best = block.valid, block.index

        return best


ba.run(Greedy())
