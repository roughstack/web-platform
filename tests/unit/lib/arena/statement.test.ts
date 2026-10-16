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

  it("rejects concept diagrams that would otherwise render blank or misleading data", () => {
    const statement = (id: string, props: unknown) => JSON.stringify({
      version: 1,
      blocks: [{ kind: "figure", illustration: { id, props } }],
    });

    expect(() => parseArenaStatement(statement("systems.snapshot", { title: "Missing states", rows: [] }))).toThrow();
    expect(() => parseArenaStatement(statement("systems.budget", {
      title: "Overfilled", capacity: 4,
      snapshots: [
        { label: "first", segments: [{ label: "used", value: 5 }] },
        { label: "second", segments: [{ label: "used", value: 1 }] },
      ],
    }))).toThrow();
    expect(() => parseArenaStatement(statement("systems.ranges", {
      title: "Outside axis", min: 0, max: 10,
      rows: [{ label: "A", start: 0, end: 5 }, { label: "B", start: 8, end: 12 }],
    }))).toThrow();
  });

  it("accepts authored story figures but rejects unknown modes and surfaces", () => {
    const figure = (id: string, props: unknown, presentation: string = "immersive") => JSON.stringify({
      version: 1,
      blocks: [{ kind: "figure", illustration: { id, props }, presentation }],
    });

    expect(parseArenaStatement(figure("systems.cache-story", { mode: "lru" }))).toHaveLength(1);
    expect(parseArenaStatement(figure("systems.cache-story", { mode: "scan" }))).toHaveLength(1);
    expect(parseArenaStatement(figure("systems.lost-ack-story", {}))).toHaveLength(1);
    expect(() => parseArenaStatement(figure("systems.cache-story", { mode: "invented" }))).toThrow();
    expect(() => parseArenaStatement(figure("systems.lost-ack-story", {}, "flashing"))).toThrow();
  });

  it("falls back only when statement.json is absent", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bytearena-statement-"));
    await expect(loadArenaStatement(root)).resolves.toBeNull();

    await writeFile(path.join(root, "statement.json"), "not json", "utf8");
    await expect(loadArenaStatement(root)).rejects.toThrow();
  });
});
