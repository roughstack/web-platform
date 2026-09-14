import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ARENA_REGISTRY_ENV,
  createArenaRegistry,
  loadArenaCatalog,
} from "@/lib/arena/catalog";
import { parseArenaManifest } from "@/lib/arena/manifest";

const temporaryDirectories: string[] = [];

const manifestYaml = `apiVersion: bytearena.dev/v1
kind: Arena
metadata:
  id: test-arena
  version: 1.0.0
  title: Test Arena
  visibility: public
  mode: practice
  difficulty: easy
  tags: [cache]
submission:
  language: go
  entrypoint: starter/cache.go
  interface: bytearena.cache.Policy/v1
build:
  command: [go, build]
  timeoutSeconds: 30
run:
  command: [./run]
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
  repetitions: 1
  warmupRuns: 0
metrics:
  - id: backing_reads
    unit: count
    direction: minimize
scoring:
  model: weighted-normalized/v1
  config: scoring.yaml
`;

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeArena(
  root: string,
  directory: string,
  source: string,
): Promise<void> {
  const arenaRoot = path.join(root, directory);
  await mkdir(path.join(arenaRoot, "starter"), { recursive: true });
  await writeFile(path.join(arenaRoot, "starter/cache.go"), "package starter\n");
  await writeFile(path.join(arenaRoot, "scoring.yaml"), "version: 1\n");
  await writeFile(path.join(arenaRoot, "arena.yaml"), source);
}

function registryEntry(id: string, visibility: "public" | "private" = "public") {
  const manifest = parseArenaManifest(
    manifestYaml
      .replace("id: test-arena", `id: ${id}`)
      .replace("visibility: public", `visibility: ${visibility}`),
  );
  return {
    manifest,
    manifestDigest: createHash("sha256").update(id).digest("hex"),
  };
}

async function writeRegistry(value: unknown): Promise<string> {
  const directory = await temporaryDirectory("bytearena-registry-");
  const registryPath = path.join(directory, "registry.json");
  await writeFile(registryPath, JSON.stringify(value));
  return registryPath;
}

describe("arena catalog", () => {
  it("creates a production registry from public external arenas", async () => {
    const root = await temporaryDirectory("bytearena-arenas-");
    await writeArena(root, "public", manifestYaml);
    await writeArena(
      root,
      "private",
      manifestYaml
        .replace("id: test-arena", "id: private-arena")
        .replace("visibility: public", "visibility: private"),
    );

    const registry = await createArenaRegistry([root]);

    expect(registry.schemaVersion).toBe(1);
    expect(registry.arenas).toHaveLength(1);
    expect(registry.arenas[0]?.manifest.metadata.id).toBe("test-arena");
    expect(registry.arenas[0]?.manifestDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps local discovery to deterministic path-free public entries", async () => {
    const root = await temporaryDirectory("bytearena-arenas-");
    await writeArena(
      root,
      "zeta",
      manifestYaml.replace("id: test-arena", "id: zeta-arena"),
    );
    await writeArena(
      root,
      "alpha",
      manifestYaml.replace("id: test-arena", "id: alpha-arena"),
    );

    const entries = await loadArenaCatalog({ environment: "test", roots: [root] });

    expect(entries.map((entry) => entry.manifest.metadata.id)).toEqual([
      "alpha-arena",
      "zeta-arena",
    ]);
    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain(root);
    expect(serialized).not.toContain("manifestPath");
    expect(serialized).not.toContain("arenaRoot");
  });

  it("fails closed when production registry configuration is absent", async () => {
    vi.stubEnv(ARENA_REGISTRY_ENV, "");

    await expect(
      loadArenaCatalog({ environment: "production", registryPath: undefined }),
    ).rejects.toThrow(ARENA_REGISTRY_ENV);
  });

  it("strictly validates and sorts a production registry", async () => {
    const registryPath = await writeRegistry({
      schemaVersion: 1,
      arenas: [registryEntry("zeta-arena"), registryEntry("alpha-arena")],
    });

    const entries = await loadArenaCatalog({
      environment: "production",
      registryPath,
    });

    expect(entries.map((entry) => entry.manifest.metadata.id)).toEqual([
      "alpha-arena",
      "zeta-arena",
    ]);
  });

  it("does not publish private registry entries", async () => {
    const registryPath = await writeRegistry({
      schemaVersion: 1,
      arenas: [registryEntry("public-arena"), registryEntry("private-arena", "private")],
    });

    const entries = await loadArenaCatalog({
      environment: "production",
      registryPath,
    });

    expect(entries.map((entry) => entry.manifest.metadata.id)).toEqual([
      "public-arena",
    ]);
  });

  it.each([
    { schemaVersion: 2, arenas: [] },
    { schemaVersion: 1, arenas: [], unexpected: true },
    {
      schemaVersion: 1,
      arenas: [{ ...registryEntry("test-arena"), manifestDigest: "ABC" }],
    },
  ])("rejects malformed production registries", async (registry) => {
    const registryPath = await writeRegistry(registry);

    await expect(
      loadArenaCatalog({ environment: "production", registryPath }),
    ).rejects.toThrow();
  });

  it("rejects duplicate arena versions before filtering visibility", async () => {
    const duplicate = registryEntry("duplicate-arena");
    const registryPath = await writeRegistry({
      schemaVersion: 1,
      arenas: [duplicate, { ...duplicate, manifestDigest: "0".repeat(64) }],
    });

    await expect(
      loadArenaCatalog({ environment: "production", registryPath }),
    ).rejects.toThrow("duplicate arena version duplicate-arena@1.0.0");
  });
});
