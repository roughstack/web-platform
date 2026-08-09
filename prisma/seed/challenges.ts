/**
 * The SSD ladder, as data.
 *
 * One idea at three depths. Each rung adds exactly one new constraint and
 * reuses everything below it, so the third is legible to anyone who worked
 * through the first two.
 *
 * Nothing here is JSX. Adding a fourth rung, or a whole second ladder, is
 * another entry in this file.
 */

import { COMPACTION_STARTERS, VICTIM_STARTERS } from "./starters";

const ALL_LANGUAGES = ["GO", "PYTHON", "C", "CPP", "JAVA", "RUST"];

/** A small hand-made instance, used to illustrate rather than to grade. */
const EXAMPLE_SLOTS = [4, -1, -1, 7, -1, 2, -1, -1, 9, -1, -1, 5];

/** A device mid-life: some blocks mostly dead, one already empty. */
const EXAMPLE_BLOCKS = [
  { index: 0, valid: 7, invalid: 1, free: 0, eraseCount: 3, isOverProvision: false },
  { index: 1, valid: 2, invalid: 6, free: 0, eraseCount: 4, isOverProvision: false },
  { index: 2, valid: 8, invalid: 0, free: 0, eraseCount: 2, isOverProvision: false },
  { index: 3, valid: 1, invalid: 7, free: 0, eraseCount: 5, isOverProvision: false },
  { index: 4, valid: 4, invalid: 3, free: 1, eraseCount: 3, isOverProvision: false },
  { index: 5, valid: 0, invalid: 0, free: 8, eraseCount: 6, isOverProvision: true },
];

const UNEVEN_WEAR = [3, 4, 2, 5, 3, 17, 4, 3, 2, 4, 3, 5];

export const CHALLENGES = [
  // ------------------------------------------------------------ rung 1
  {
    slug: "compaction",
    title: "Compaction",
    summary:
      "Live values are scattered through an array. Gather them into the front, moving as little data as possible.",
    difficulty: "EASY" as const,
    category: "Storage",
    pack: "ssd",
    task: "compaction",
    ladder: "ssd-garbage-collection",
    tier: 1,
    sortOrder: 10,
    languages: ALL_LANGUAGES,
    starterCode: COMPACTION_STARTERS,
    taskParams: { slots: 256, liveFraction: 0.55 },
    timeLimitSec: 15,
    metricsConfig: {
      metrics: [
        {
          key: "moves",
          label: "Moves used",
          unit: "",
          description: "How many times you copied a value from one slot to another.",
          lowerIsBetter: true,
          weight: 1,
        },
        {
          key: "optimal",
          label: "Fewest possible",
          unit: "",
          description: "The provable minimum for this instance.",
          lowerIsBetter: true,
          weight: 0,
        },
        {
          key: "efficiency",
          label: "Efficiency",
          unit: "",
          description: "Optimal divided by your moves. 1.00 is perfect.",
          lowerIsBetter: false,
          weight: 0,
        },
      ],
    },
    blocks: [
      {
        kind: "prose",
        md: "You are given an array of slots. Some hold live values; the rest are empty. The live values are scattered, and you need them packed into the front of the array so the free space is contiguous at the back.",
      },
      {
        kind: "figure",
        label: "FIG 1",
        illustration: { id: "ssd.slotStrip", props: { slots: EXAMPLE_SLOTS, prefix: 5 } },
        caption:
          "Five live values scattered across twelve slots. The line marks where they need to end up: slots 0 to 4.",
      },
      {
        kind: "prose",
        md: "Return the **moves** that get there. A move copies the value in one slot into an empty one, leaving the source empty. Moves are applied in the order you give them.\n\nThe catch is that a move is not free. Every one of them is real work, and the whole challenge is doing as few as possible.",
      },
      { kind: "interface" },
      {
        kind: "example",
        input: "slots = [4, -1, -1, 7, -1]",
        output: "[[3, 1]]",
        explain:
          "Three live values means they belong in slots 0, 1 and 2. Slot 0 already holds one and slot 2 is empty — but so is slot 1, and value 7 at slot 3 is the only one out of place. One move is enough.",
      },
      {
        kind: "callout",
        tone: "insight",
        title: "There is a right answer here",
        md: "Count the live values that already sit outside the prefix they need to end up in. Each one has to move at least once, and there are exactly enough empty slots inside the prefix to take them. So the minimum is that count, and it is always achievable.\n\nThis is the one rung on the ladder with a provable optimum. You are scored against it directly, not ranked against other people.",
      },
      {
        kind: "constraints",
        items: [
          "A move's source must hold a live value, and its destination must be empty.",
          "Moving a slot onto itself is rejected — it does nothing and still costs a write.",
          "Nothing may be lost or duplicated. The values at the end must be the values you started with.",
          "The array holds up to 256 slots.",
        ],
      },
      {
        kind: "callout",
        tone: "note",
        title: "Why this is the first rung",
        md: "An SSD cannot overwrite data in place. Superseded data sits there dead until the space is reclaimed, and reclaiming it means copying the live data somewhere else first. That copying is the entire cost of garbage collection, and it is what you are minimising here — before any of the vocabulary shows up.",
      },
    ],
  },

  // ------------------------------------------------------------ rung 2
  {
    slug: "victim-selection",
    title: "Victim Selection",
    summary:
      "Space on flash is only reclaimable a whole block at a time. Choose which block to erase, and pay for every live page inside it.",
    difficulty: "MEDIUM" as const,
    category: "Storage",
    pack: "ssd",
    task: "victim-selection",
    ladder: "ssd-garbage-collection",
    tier: 2,
    sortOrder: 20,
    languages: ALL_LANGUAGES,
    starterCode: VICTIM_STARTERS,
    taskParams: {
      blocks: 32,
      pagesPerBlock: 64,
      overProvisionBlocks: 4,
      operations: 4000,
      hotFraction: 0.2,
      hotProbability: 0.8,
    },
    metricsConfig: {
      metrics: [
        {
          key: "write_amplification",
          label: "Write amplification",
          unit: "×",
          description:
            "Total writes divided by the writes the workload actually asked for. 1.00 would mean no overhead at all.",
          lowerIsBetter: true,
          weight: 1,
        },
        {
          key: "gc_writes",
          label: "Migration writes",
          unit: "",
          description: "Pages you had to copy to free the blocks you chose.",
          lowerIsBetter: true,
          weight: 0.5,
        },
        {
          key: "host_writes",
          label: "Workload writes",
          unit: "",
          description: "Writes the workload asked for. The same for everyone.",
          lowerIsBetter: false,
          weight: 0,
        },
        {
          key: "total_erases",
          label: "Erases",
          unit: "",
          description: "How many blocks you erased over the run.",
          lowerIsBetter: true,
          weight: 0.3,
        },
      ],
    },
    blocks: [
      {
        kind: "prose",
        md: "Now the flat array becomes a real device. Pages are grouped into **blocks**, and the grouping is not cosmetic — it is the whole problem.",
      },
      {
        kind: "figure",
        label: "FIG 1",
        illustration: {
          id: "ssd.blockGrid",
          props: { blocks: EXAMPLE_BLOCKS, pagesPerBlock: 8 },
        },
        caption:
          "Six blocks of eight pages. Block 3 is almost entirely dead; block 2 is entirely live. Block 5 is over-provision space, held back for migrations.",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "You cannot free a page",
        md: "Flash is written a page at a time but erased a **block** at a time. A dead page is not reusable on its own — the whole block containing it has to be erased. And erasing takes everything with it, so every live page in that block must be copied elsewhere first.",
      },
      {
        kind: "prose",
        md: "When the device runs low on space, you are asked which block to reclaim. The harness does the rest: it migrates the live pages out of your chosen block, erases it, and hands the free space back.\n\nSo your decision has a direct price. Pick a block that is mostly dead and you pay almost nothing. Pick one that is mostly live and you rewrite nearly a whole block just to free a few pages.",
      },
      { kind: "interface" },
      {
        kind: "figure",
        label: "FIG 2",
        illustration: {
          id: "ssd.writeAmpBar",
          props: { hostWrites: 4000, gcWrites: 2600 },
        },
        caption:
          "What you are scored on. The workload asked for the blue writes; the amber ones are what your choices cost on top. This run amplified writes by 1.65×.",
      },
      {
        kind: "steps",
        items: [
          {
            title: "Start greedy",
            md: "Reclaim the block with the most dead pages. It is the obvious move and it is a genuinely decent baseline — the starter code already does it.",
          },
          {
            title: "Notice what greedy ignores",
            md: "A block that is 60% dead *right now* might be 95% dead in a moment, if the data in it is about to be overwritten anyway. Greedy cannot see that coming.",
          },
          {
            title: "Think about age",
            md: "Data that has survived a long time tends to keep surviving. Data written recently tends to be replaced soon. A block full of old data will not decay on its own — but a block full of young data might, if you leave it alone a little longer.",
          },
        ],
      },
      {
        kind: "constraints",
        items: [
          "Return an index of a block that exists. Anything else fails the run.",
          "Reclaiming an over-provision block is legal but shrinks the reserve migrations draw from. It is almost always a mistake.",
          "The workload is randomised but seeded, so the same solution always faces the same traffic.",
          "The device has 32 blocks of 64 pages, with 4 blocks held in reserve.",
        ],
      },
      {
        kind: "callout",
        tone: "note",
        title: "No single right answer",
        md: "Unlike the first rung, there is no provable optimum here — it depends on traffic nobody can see in advance. So you are ranked rather than scored against a target. Beating greedy is the real bar.",
      },
    ],
  },

  // ------------------------------------------------------------ rung 3
  {
    slug: "wear-levelling",
    title: "Wear Levelling",
    summary:
      "Blocks die after a finite number of erases. Keep write amplification low without burning any single block out — under fault injection.",
    difficulty: "HARD" as const,
    category: "Storage",
    pack: "ssd",
    task: "wear-leveling",
    ladder: "ssd-garbage-collection",
    tier: 3,
    sortOrder: 30,
    languages: ALL_LANGUAGES,
    starterCode: VICTIM_STARTERS,
    taskParams: {
      blocks: 32,
      pagesPerBlock: 64,
      overProvisionBlocks: 4,
      operations: 6000,
      hotFraction: 0.15,
      hotProbability: 0.9,
    },
    timeLimitSec: 45,
    metricsConfig: {
      metrics: [
        {
          key: "write_amplification",
          label: "Write amplification",
          unit: "×",
          description: "Total writes divided by the writes the workload asked for.",
          lowerIsBetter: true,
          weight: 1,
        },
        {
          key: "wear_spread",
          label: "Wear spread",
          unit: "",
          description:
            "Standard deviation of erase counts across blocks. Lower means the device lasts longer.",
          lowerIsBetter: true,
          weight: 1,
        },
        {
          key: "max_erase_count",
          label: "Most-worn block",
          unit: "",
          description: "Erases on the single worst-hit block. This is what fails first.",
          lowerIsBetter: true,
          weight: 0.5,
        },
        {
          key: "total_erases",
          label: "Erases",
          unit: "",
          description: "How many blocks you erased over the run.",
          lowerIsBetter: true,
          weight: 0.3,
        },
      ],
    },
    blocks: [
      {
        kind: "prose",
        md: "Everything from the previous rung still applies. One fact is added, and it changes the shape of a good answer completely: **a flash block wears out**. After some tens of thousands of erases it stops holding charge reliably, and a device is dead when enough of its blocks are.",
      },
      {
        kind: "figure",
        label: "FIG 1",
        illustration: { id: "ssd.wearHistogram", props: { eraseCounts: UNEVEN_WEAR } },
        caption:
          "A policy optimising only for write amplification. Block 5 is being erased four times as often as any other — the device will fail there while every other block is barely used.",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "The tension",
        md: "The block that is cheapest to reclaim is the one with the most dead pages. But a block fills with dead pages because the data in it is hot, and hot data keeps being rewritten. So the cheapest block to reclaim, over and over, is the same one — and you burn it out.\n\nSpreading wear means sometimes reclaiming a block you would rather not. That costs write amplification. Both are scored.",
      },
      {
        kind: "prose",
        md: "Your interface has not changed. What you are optimising has.",
      },
      { kind: "interface" },
      {
        kind: "steps",
        items: [
          {
            title: "Separate hot from cold",
            md: "Cold data migrated into a block makes that block stay full and stop churning. That is a feature: it parks stable data somewhere it stops costing you.",
          },
          {
            title: "Watch the tail, not the average",
            md: "A device fails at its worst block, not its mean one. A policy with good average wear and one block at four times the average has not solved the problem.",
          },
          {
            title: "Read the literature",
            md: "The cost-benefit heuristic from Rosenblum and Ousterhout's log-structured filesystem work (1991) weighs the space a reclaim frees against what it costs and how long the block has been stable. It is a good place to start and it is beatable.",
          },
        ],
      },
      {
        kind: "prose",
        md: "### Fault injection\n\nA policy that scores beautifully on clean traffic and corrupts data under stress has not solved anything. Three scenarios run after the main workload, and failing any of them fails the submission:",
      },
      {
        kind: "constraints",
        items: [
          "**Hot-page thrash.** One page is rewritten thousands of times. Policies that migrate it on every reclaim pay for it.",
          "**Capacity pressure.** The device is filled to its limit with minimal reserve, leaving no room for a late or wasteful reclaim.",
          "**Power loss during migration.** Your reclaim is interrupted after some pages have moved but before the erase. The device must still be consistent afterwards.",
        ],
      },
      {
        kind: "callout",
        tone: "insight",
        title: "What good looks like",
        md: "A flat wear histogram and write amplification close to what you managed on the previous rung. If your amplification barely moved but the tall bar is gone, you have done the hard part.",
      },
    ],
  },
];
