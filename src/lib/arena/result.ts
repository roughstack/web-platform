import { z } from "zod";

import type { ArenaManifestV1 } from "./manifest";

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

const nonnegativeCounterSchema = z.number().finite().nonnegative();

export const arenaResultV1Schema = z
  .object({
    protocol_version: z.literal(1),
    arena_id: identifierSchema,
    arena_version: semverSchema,
    seed: z.union([
      z.number().int().nonnegative(),
      z.string().regex(/^(?:0|[1-9]\d{0,19})$/),
    ]),
    verdict: z.enum(["pass", "fail"]),
    score: z.number().int().min(0).max(10_000),
    metrics: z.record(metricIdentifierSchema, nonnegativeCounterSchema),
    violations: z.array(z.string().min(1).max(500)).max(100),
    run: z
      .object({
        workload_id: identifierSchema,
        duration_ns: nonnegativeCounterSchema,
        peak_memory_bytes: nonnegativeCounterSchema,
      })
      .strict(),
  })
  .strict();

export type ArenaResultV1 = z.infer<typeof arenaResultV1Schema>;

export function parseArenaResult(source: string): ArenaResultV1 {
  return arenaResultV1Schema.parse(JSON.parse(source));
}

export function assertResultMatchesManifest(
  result: ArenaResultV1,
  manifest: ArenaManifestV1,
): void {
  if (result.arena_id !== manifest.metadata.id) {
    throw new Error(`result arena_id ${result.arena_id} does not match ${manifest.metadata.id}`);
  }
  if (result.arena_version !== manifest.metadata.version) {
    throw new Error(
      `result arena_version ${result.arena_version} does not match ${manifest.metadata.version}`,
    );
  }

  const expectedMetrics = new Set(manifest.metrics.map((metric) => metric.id));
  const actualMetrics = new Set(Object.keys(result.metrics));
  const missing = [...expectedMetrics].filter((metric) => !actualMetrics.has(metric));
  const unexpected = [...actualMetrics].filter((metric) => !expectedMetrics.has(metric));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `result metrics differ from manifest; missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
    );
  }
}
