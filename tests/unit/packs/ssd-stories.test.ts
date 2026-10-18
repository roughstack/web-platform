import { describe, expect, it } from "vitest";

import { CHALLENGES } from "../../../prisma/seed/challenges";
import { COMPACTION_FRAMES } from "@/packs/ssd/illustrations/ladder-stories";

describe("compaction explainer", () => {
  it("shows exactly three legal moves and preserves the live values", () => {
    expect(COMPACTION_FRAMES).toHaveLength(4);
    const startingValues = COMPACTION_FRAMES[0].filter((value) => value !== -1).sort();
    for (let frame = 1; frame < COMPACTION_FRAMES.length; frame++) {
      const before = COMPACTION_FRAMES[frame - 1];
      const after = COMPACTION_FRAMES[frame];
      const changed = before.flatMap((value, slot) => value === after[slot] ? [] : [slot]);
      expect(changed).toHaveLength(2);
      const source = changed.find((slot) => before[slot] !== -1)!;
      const destination = changed.find((slot) => before[slot] === -1)!;
      expect(after[source]).toBe(-1);
      expect(after[destination]).toBe(before[source]);
      expect(after.filter((value) => value !== -1).sort()).toEqual(startingValues);
    }
    expect(COMPACTION_FRAMES.at(-1)?.slice(0, 5)).toEqual([4, 2, 9, 7, 5]);
    expect(COMPACTION_FRAMES.at(-1)?.slice(5)).toEqual(Array(7).fill(-1));
  });

  it("keeps the static final figure aligned with the animated final frame", () => {
    const compaction = CHALLENGES.find((challenge) => challenge.slug === "compaction");
    const figure = compaction?.blocks.filter((block) => block.kind === "figure")[1];
    expect((figure?.illustration?.props as { slots?: number[] })?.slots).toEqual(COMPACTION_FRAMES.at(-1));
  });
});
