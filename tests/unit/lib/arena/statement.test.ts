import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadArenaStatement, parseArenaStatement } from "@/lib/arena/statement";

describe("arena educational statements", () => {
  it("accepts the public data-only block vocabulary", () => {
    const blocks = parseArenaStatement(JSON.stringify({
      version: 1,
      blocks: [
        { kind: "prose", md: "Start with the request." },
        {
          kind: "figure",
          illustration: {
            id: "systems.flow",
            props: { nodes: [{ label: "Request" }, { label: "Cache" }] },
          },
          label: "FIG 1",
        },
        { kind: "code", label: "What you implement", language: "Go", code: "func New() Policy" },
      ],
    }));

    expect(blocks).toHaveLength(3);
    expect(blocks[1]).toMatchObject({ kind: "figure", illustration: { id: "systems.flow" } });
  });

  it("rejects executable or unregistered content kinds", () => {
    expect(() => parseArenaStatement(JSON.stringify({
      version: 1,
      blocks: [{ kind: "pack:arbitrary", props: { script: "alert(1)" } }],
    }))).toThrow();
  });

  it("falls back only when statement.json is absent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bytearena-statement-"));
    await expect(loadArenaStatement(root)).resolves.toBeNull();

    await writeFile(path.join(root, "statement.json"), "not json", "utf8");
    await expect(loadArenaStatement(root)).rejects.toThrow();
  });
});
