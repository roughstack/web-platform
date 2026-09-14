import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { discoverArenaManifests } from "@/lib/arena/discovery";
import { loadArenaManifest, parseArenaManifest } from "@/lib/arena/manifest";

const manifest = `
apiVersion: bytearena.dev/v1
kind: Arena
metadata:
  id: cache-pressure-easy
  version: 1.0.0
  title: Cache Pressure
  visibility: public
  mode: practice
  difficulty: easy
  tags: [cache, concurrency]
submission:
  language: go
  entrypoint: starter/cache.go
  interface: bytearena.cache.Cache/v1
build:
  command: ["/arena/bin/build-submission"]
  timeoutSeconds: 30
run:
  command: ["/arena/bin/run-harness"]
  protocol: bytearena.result/v1
  timeoutSeconds: 120
resources:
  cpuCount: 1
  memoryMiB: 512
  diskMiB: 1024
  network: disabled
  maxProcesses: 64
evaluation:
  correctnessGate: true
  publicSuite: public-v1
  repetitions: 3
  warmupRuns: 1
metrics:
  - id: backing_reads
    unit: operations
    direction: minimize
scoring:
  model: weighted-normalized/v1
  config: scoring.yaml
`;

async function writeArena(root: string, name: string, source = manifest): Promise<string> {
  const arenaRoot = path.join(root, name);
  await mkdir(path.join(arenaRoot, "starter"), { recursive: true });
  await writeFile(path.join(arenaRoot, "starter/cache.go"), "package starter\n");
  await writeFile(path.join(arenaRoot, "scoring.yaml"), "version: 1\n");
  await writeFile(path.join(arenaRoot, "arena.yaml"), source);
  return arenaRoot;
}

describe("Arena Specification v1", () => {
  it("parses a valid manifest", () => {
    expect(parseArenaManifest(manifest).metadata.id).toBe("cache-pressure-easy");
  });

  it("rejects duplicate metric IDs", () => {
    const duplicate = manifest.replace(
      "scoring:\n",
      "  - id: backing_reads\n    unit: operations\n    direction: minimize\nscoring:\n",
    );
    expect(() => parseArenaManifest(duplicate)).toThrow(/duplicate metric id/);
  });

  it("rejects paths that escape the arena", () => {
    expect(() => parseArenaManifest(manifest.replace("starter/cache.go", "../cache.go"))).toThrow(
      /arena root/,
    );
  });

  it("loads referenced files and returns a stable digest", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "bytearena-manifest-"));
    const arenaRoot = await writeArena(root, "cache-pressure-easy");
    const first = await loadArenaManifest(path.join(arenaRoot, "arena.yaml"));
    const second = await loadArenaManifest(path.join(arenaRoot, "arena.yaml"));
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.digest).toBe(second.digest);
  });

  it("discovers sibling arena packages and rejects duplicate identity", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "bytearena-discovery-"));
    await writeArena(root, "one");
    expect(await discoverArenaManifests([root])).toHaveLength(1);

    await writeArena(root, "two");
    await expect(discoverArenaManifests([root])).rejects.toThrow(/duplicate arena version/);
  });
});

