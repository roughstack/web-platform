/**
 * The greedy baseline: reclaim whichever block has the most dead pages.
 *
 * <p>This is the reference solution every real policy is measured against, and
 * it is the same strategy implemented in each of the six SDKs so their results
 * can be compared byte for byte.
 */
public class Greedy extends ByteArena.Solution {

    @Override
    public String name() {
        return "greedy";
    }

    @Override
    public int selectVictim(ByteArena.Stats stats) {
        int best = -1, mostInvalid = -1;
        for (ByteArena.Block block : stats.blocks) {
            if (block.invalid > mostInvalid) {
                mostInvalid = block.invalid;
                best = block.index;
            }
        }

        // Every block is either full of live data or already empty. Fall back
        // to the block holding the least live data, since that is the cheapest
        // one to evacuate.
        if (best < 0 || mostInvalid == 0) {
            int fewestValid = stats.pagesPerBlock + 1;
            for (ByteArena.Block block : stats.blocks) {
                if (block.isOverProvision) continue;
                if (block.valid > 0 && block.valid < fewestValid) {
                    fewestValid = block.valid;
                    best = block.index;
                }
            }
        }

        return best;
    }

    public static void main(String[] args) {
        ByteArena.run(new Greedy());
    }
}
