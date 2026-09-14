import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import { parse as parseYaml } from "yaml";
import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const metricIdentifierSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);

const semverSchema = z
  .string()
  .regex(
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
  );

const commandSchema = z.array(z.string().min(1)).min(1);

const relativePathSchema = z.string().min(1).superRefine((value, ctx) => {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
  if (path.posix.isAbsolute(normalized) || normalized === ".." || normalized.startsWith("../")) {
    ctx.addIssue({ code: "custom", message: "must stay inside the arena root" });
  }
});

const metricSchema = z
  .object({
    id: metricIdentifierSchema,
    unit: z.string().min(1),
    direction: z.enum(["minimize", "maximize"]),
    precision: z.number().int().min(0).max(12).optional(),
    weight: z.number().finite().nonnegative().optional(),
  })
  .strict();

export const arenaManifestV1Schema = z
  .object({
    apiVersion: z.literal("bytearena.dev/v1"),
    kind: z.literal("Arena"),
    metadata: z
      .object({
        id: identifierSchema,
        version: semverSchema,
        title: z.string().min(1).max(200),
        visibility: z.enum(["public", "private"]),
        mode: z.enum(["practice", "ranked"]),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        tags: z.array(identifierSchema).max(20).default([]),
      })
      .strict(),
    submission: z
      .object({
        language: identifierSchema,
        entrypoint: relativePathSchema,
        interface: z.string().min(1),
      })
      .strict(),
    build: z
      .object({
        command: commandSchema,
        timeoutSeconds: z.number().int().positive().max(600),
      })
      .strict(),
    run: z
      .object({
        command: commandSchema,
        protocol: z.literal("bytearena.result/v1"),
        timeoutSeconds: z.number().int().positive().max(3600),
      })
      .strict(),
    resources: z
      .object({
        cpuCount: z.number().positive().max(16),
        memoryMiB: z.number().int().positive().max(32768),
        diskMiB: z.number().int().positive().max(131072),
        network: z.enum(["disabled", "arena-only"]),
        maxProcesses: z.number().int().positive().max(4096),
      })
      .strict(),
    evaluation: z
      .object({
        correctnessGate: z.literal(true),
        publicSuite: identifierSchema,
        officialSuiteContract: identifierSchema.optional(),
        repetitions: z.number().int().positive().max(100),
        warmupRuns: z.number().int().nonnegative().max(20),
      })
      .strict(),
    metrics: z.array(metricSchema).min(1),
    scoring: z
      .object({
        model: z.literal("weighted-normalized/v1"),
        config: relativePathSchema,
      })
      .strict(),
    capabilities: z.array(identifierSchema).max(20).optional(),
  })
  .strict()
  .superRefine((manifest, ctx) => {
    const seen = new Set<string>();
    for (const [index, metric] of manifest.metrics.entries()) {
      if (seen.has(metric.id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate metric id: ${metric.id}`,
          path: ["metrics", index, "id"],
        });
      }
      seen.add(metric.id);
    }
  });

export type ArenaManifestV1 = z.infer<typeof arenaManifestV1Schema>;

export interface LoadedArenaManifest {
  manifest: ArenaManifestV1;
  manifestPath: string;
  arenaRoot: string;
  digest: string;
}

export function parseArenaManifest(source: string): ArenaManifestV1 {
  return arenaManifestV1Schema.parse(parseYaml(source));
}

export async function loadArenaManifest(manifestPath: string): Promise<LoadedArenaManifest> {
  const absoluteManifest = path.resolve(manifestPath);
  const source = await readFile(absoluteManifest, "utf8");
  const manifest = parseArenaManifest(source);
  const arenaRoot = path.dirname(absoluteManifest);

  await Promise.all([
    assertArenaFile(arenaRoot, manifest.submission.entrypoint),
    assertArenaFile(arenaRoot, manifest.scoring.config),
  ]);

  return {
    manifest,
    manifestPath: absoluteManifest,
    arenaRoot,
    digest: createHash("sha256").update(source).digest("hex"),
  };
}

async function assertArenaFile(arenaRoot: string, relativePath: string): Promise<void> {
  const root = await realpath(arenaRoot);
  const candidate = await realpath(path.resolve(root, relativePath));
  const relative = path.relative(root, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${relativePath} resolves outside the arena root`);
  }

  if (!(await stat(candidate)).isFile()) {
    throw new Error(`${relativePath} must reference a file`);
  }
}
