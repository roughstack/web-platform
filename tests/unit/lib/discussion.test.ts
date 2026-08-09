import { describe, expect, it } from "vitest";

import {
  MAX_REPLY_LENGTH,
  authorLabelFor,
  validateReply,
} from "@/lib/discussion";

describe("validateReply", () => {
  it("accepts a reply that discusses the idea", () => {
    const result = validateReply(
      "Greedy was doing fine until I looked at the erase counts and realised one block was taking almost all of them.",
    );
    expect(result.ok).toBe(true);
  });

  it("accepts prose that names constructs without being code", () => {
    // Rejecting this would make the rule unusable: people have to be able to
    // talk about return values and loops without posting a solution.
    const replies = [
      "You want to return the block with the fewest valid pages, not the most invalid ones.",
      "I keep a heap keyed on invalid count and it holds up until the hot set moves.",
      "Think about what a for loop over every block costs when you do it on every reclaim.",
    ];
    for (const reply of replies) {
      expect(validateReply(reply), reply).toMatchObject({ ok: true });
    }
  });

  it("rejects a reply that is too short to say anything", () => {
    expect(validateReply("nice")).toMatchObject({ ok: false, reason: "too-short" });
  });

  it("rejects a reply past the cap and says how long it was", () => {
    const result = validateReply("a".repeat(MAX_REPLY_LENGTH + 50));
    expect(result).toMatchObject({ ok: false, reason: "too-long" });
    expect(result.message).toContain(String(MAX_REPLY_LENGTH + 50));
  });

  it("rejects fenced code blocks", () => {
    const result = validateReply(
      "here is what worked for me\n```go\nfunc (s Solution) SelectVictim() int { return 0 }\n```",
    );
    expect(result).toMatchObject({ ok: false, reason: "code-block" });
  });

  it("rejects tilde-fenced blocks too", () => {
    const result = validateReply("try this\n~~~\nreturn best;\n~~~");
    expect(result).toMatchObject({ ok: false, reason: "code-block" });
  });

  it("rejects an indented block, which is how people evade fences", () => {
    const result = validateReply(
      "this is the trick I used and it worked really well for me\n\n    best = i\n    most = invalid\n",
    );
    expect(result).toMatchObject({ ok: false, reason: "code-block" });
  });

  it("rejects a snippet pasted without any fencing", () => {
    const result = validateReply(
      "def select_victim(self, stats):\n" +
        "    best = -1\n" +
        "    for b in stats.blocks:\n" +
        "        if b.invalid > best:\n" +
        "            return b.index",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a multi-line C-style snippet", () => {
    const result = validateReply(
      "int select_victim(const ba_stats *s) {\n" +
        "  for (int i = 0; i < s->block_count; i++) { }\n" +
        "  return best;\n" +
        "}",
    );
    expect(result).toMatchObject({ ok: false });
  });

  it("counts length after trimming, so whitespace cannot smuggle a reply past the cap", () => {
    const body = `   ${"a".repeat(MAX_REPLY_LENGTH)}   `;
    expect(validateReply(body).ok).toBe(true);
  });
});

describe("authorLabelFor", () => {
  it("gives the same session the same handle", () => {
    expect(authorLabelFor("session-abc")).toBe(authorLabelFor("session-abc"));
  });

  it("gives different sessions different handles", () => {
    expect(authorLabelFor("session-abc")).not.toBe(authorLabelFor("session-xyz"));
  });

  it("produces a short, non-identifying handle", () => {
    const label = authorLabelFor("a-very-long-session-identifier-that-reveals-things");
    expect(label).toMatch(/^anon-[0-9a-f]{1,4}$/);
    expect(label).not.toContain("session");
  });
});
