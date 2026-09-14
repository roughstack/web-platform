import { describe, expect, it } from "vitest";

import { parseArenaManifest } from "@/lib/arena/manifest";
import { assertResultMatchesManifest, parseArenaResult } from "@/lib/arena/result";

const manifest = parseArenaManifest(`
apiVersion: bytearena.dev/v1
kind: Arena
metadata:
  id: cache-pressure-easy
  version: 1.0.0
  title: Cache Pressure
  visibility: public
  mode: practice
submission:
  language: go
  entrypoint: starter/cache.go
  interface: bytearena.cache.Cache/v1
build:
  command: ["go", "test", "./..."]
  timeoutSeconds: 60
run:
  command: ["go", "run", "./cmd/smoke"]
  protocol: bytearena.result/v1
  timeoutSeconds: 120
resources:
  cpuCount: 1
  memoryMiB: 256
  diskMiB: 512
  network: disabled
  maxProcesses: 16
evaluation:
  correctnessGate: true
  publicSuite: public-v1
  repetitions: 3
  warmupRuns: 1
metrics:
  - id: backing_reads
    unit: operations
    direction: minimize
  - id: metadata_work
    unit: operations
    direction: minimize
  - id: peak_accounted_bytes
    unit: bytes
    direction: minimize
scoring:
  model: weighted-normalized/v1
  config: scoring.yaml
`);

const result = JSON.stringify({
  protocol_version: 1,
  arena_id: "cache-pressure-easy",
  arena_version: "1.0.0",
  seed: "18446744073709551615",
  verdict: "pass",
  score: 0,
  metrics: {
    backing_reads: 1328,
    metadata_work: 9335,
    peak_accounted_bytes: 4096,
  },
  violations: [],
  run: {
    workload_id: "public-smoke-v1",
    duration_ns: 0,
    peak_memory_bytes: 4096,
  },
});

describe("Arena Result v1", () => {
  it("parses the versioned envelope and preserves a uint64 decimal seed", () => {
    expect(parseArenaResult(result).seed).toBe("18446744073709551615");
  });

  it("matches arena identity, version, and the complete metric contract", () => {
    expect(() => assertResultMatchesManifest(parseArenaResult(result), manifest)).not.toThrow();
  });

  it("rejects missing or unexpected metrics", () => {
    const parsed = JSON.parse(result) as { metrics: Record<string, number> };
    delete parsed.metrics.metadata_work;
    parsed.metrics.extra_work = 1;
    expect(() => assertResultMatchesManifest(parseArenaResult(JSON.stringify(parsed)), manifest)).toThrow(
      /missing=\[metadata_work\].*unexpected=\[extra_work\]/,
    );
  });

  it("rejects malformed verdicts and scores", () => {
    const parsed = JSON.parse(result) as { verdict: string; score: number };
    parsed.verdict = "unknown";
    parsed.score = 10_001;
    expect(() => parseArenaResult(JSON.stringify(parsed))).toThrow();
  });
});
