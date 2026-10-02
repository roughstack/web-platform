import path from "node:path";

import { describe, expect, it } from "vitest";

import { safeWorkspacePath, withSeed } from "@/lib/execution/arena-runner";

describe("external arena execution helpers", () => {
  it("changes only an existing seed value", () => {
    expect(withSeed(["go", "run", "./cmd", "--seed", "12345"], 77)).toEqual([
      "go",
      "run",
      "./cmd",
      "--seed",
      "77",
    ]);
    expect(withSeed(["go", "test", "./..."], 77)).toEqual([
      "go",
      "test",
      "./...",
    ]);
  });

  it("keeps the contestant entrypoint inside the copied workspace", () => {
    const workspace = path.resolve("/tmp/bytearena-workspace");
    expect(safeWorkspacePath(workspace, "arenas/cache/starter/cache.go")).toBe(
      path.join(workspace, "arenas/cache/starter/cache.go"),
    );
    expect(() => safeWorkspacePath(workspace, "../outside.go")).toThrow(
      "outside the execution workspace",
    );
  });
});
