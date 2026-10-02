import { describe, expect, it } from "vitest";

import { arenaReadmeBlocks, readmeSummary } from "@/lib/arena/presentation";

const README = `# Cache Pressure — Easy

A cache fronts an expensive backing store.
Implement a policy that avoids unnecessary reads.

## Scenario

Requests arrive on an injected clock.

## Contract

Implement the cache interface.

## Verify

Run the repository smoke command.
`;

describe("arena challenge material", () => {
  it("derives a compact listing summary", () => {
    expect(readmeSummary(README)).toBe(
      "A cache fronts an expensive backing store. Implement a policy that avoids unnecessary reads.",
    );
  });

  it("turns educational sections into readable blocks and omits repository-only verification", () => {
    const blocks = arenaReadmeBlocks(README);
    expect(blocks[0]).toMatchObject({ kind: "callout", title: "A good way in" });
    expect(blocks).toContainEqual({
      kind: "prose",
      md: "## Scenario\n\nRequests arrive on an injected clock.",
    });
    expect(JSON.stringify(blocks)).not.toContain("## Verify");
  });
});
