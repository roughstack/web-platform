import { describe, expect, it } from "vitest";

import type { ArenaCatalogEntry } from "@/lib/arena/catalog";
import { parseArenaManifest } from "@/lib/arena/manifest";
import {
  arenaFamilyId,
  arenaMetricDefs,
  buildArenaLadder,
  cleanArenaTitle,
} from "@/lib/arena/presentation";

function entry(id: string, title: string, difficulty?: "easy" | "medium" | "hard") {
  const manifest = parseArenaManifest(`
apiVersion: bytearena.dev/v1
kind: Arena
metadata:
  id: ${id}
  version: 1.0.0
  title: ${title}
  visibility: public
  mode: practice
  ${difficulty ? `difficulty: ${difficulty}` : ""}
  tags: [systems]
submission:
  language: go
  entrypoint: starter/starter.go
  interface: bytearena.test.Policy/v1
build:
  command: [go, test, ./...]
  timeoutSeconds: 30
run:
  command: [go, run, ./cmd/smoke]
  protocol: bytearena.result/v1
  timeoutSeconds: 30
resources:
  cpuCount: 1
  memoryMiB: 256
  diskMiB: 512
  network: disabled
  maxProcesses: 16
evaluation:
  correctnessGate: true
  publicSuite: public-v1
  repetitions: 1
  warmupRuns: 0
metrics:
  - id: backing_reads
    unit: operations
    direction: minimize
    precision: 0
    weight: 0.7
scoring:
  model: weighted-normalized/v1
  config: scoring.yaml
`);
  return { manifest, manifestDigest: "a".repeat(64) } satisfies ArenaCatalogEntry;
}

describe("arena presentation", () => {
  it.each([
    ["Cache Pressure — Easy", "Cache Pressure"],
    ["Cache Pressure – medium", "Cache Pressure"],
    ["Cache Pressure: HARD", "Cache Pressure"],
    ["Already clean", "Already clean"],
  ])("cleans difficulty from %s", (input, expected) => {
    expect(cleanArenaTitle(input)).toBe(expected);
  });

  it("groups and sorts only real variants", () => {
    const entries = [
      entry("cache-pressure-medium", "Cache Pressure — Medium", "medium"),
      entry("other-easy", "Other — Easy", "easy"),
      entry("cache-pressure-easy", "Cache Pressure — Easy", "easy"),
    ];

    expect(arenaFamilyId("cache-pressure-hard")).toBe("cache-pressure");
    expect(buildArenaLadder(entries, "cache-pressure")).toEqual([
      { slug: "cache-pressure-easy", title: "Cache Pressure", difficulty: "EASY", tier: 1 },
      { slug: "cache-pressure-medium", title: "Cache Pressure", difficulty: "MEDIUM", tier: 2 },
    ]);
  });

  it("maps manifest metrics to the shared result UI", () => {
    expect(arenaMetricDefs(entry("cache-easy", "Cache", "easy").manifest)).toEqual([
      {
        key: "backing_reads",
        label: "Backing reads",
        unit: "operations",
        description: "Backing reads (minimize).",
        lowerIsBetter: true,
        weight: 0.7,
      },
    ]);
  });
});
