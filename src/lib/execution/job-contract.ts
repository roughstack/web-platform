import { createHash } from "node:crypto";
import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const uint32 = z.number().int().min(0).max(0xffff_ffff);
const identifier = z.string().trim().min(1).max(200);

const variantSchema = z.object({
  blocks: z.number().int().positive(),
  pagesPerBlock: z.number().int().positive(),
  logicalPages: z.number().int().positive(),
  hotFraction: z.number().min(0).max(1),
  hotProbability: z.number().min(0).max(1),
}).strict();

const commonInput = z.object({
  schemaVersion: z.literal(1),
  submissionId: identifier,
  challengeId: identifier,
  language: z.enum(["GO", "PYTHON", "C", "CPP", "JAVA", "RUST"]),
  sourceSha256: digest,
  judgePolicyVersion: identifier,
  limits: z.object({
    timeSec: z.number().int().positive(),
    memoryMiB: z.number().int().positive(),
  }).strict(),
  workload: z.object({
    task: identifier,
    seed: uint32,
    variant: variantSchema,
    params: z.json(),
  }).strict(),
}).strict();

/** A job snapshots the run settings; participant source stays in Submission. */
export const executionJobInputV1Schema = z.discriminatedUnion("kind", [
  commonInput.extend({ kind: z.literal("legacy") }),
  commonInput.extend({
    kind: z.literal("arena"),
    arena: z.object({
      id: identifier,
      version: identifier,
      manifestDigest: digest,
    }).strict(),
  }),
]);

export type ExecutionJobInputV1 = z.infer<typeof executionJobInputV1Schema>;

/** Written by a future worker, never inferred from the browser or a stub run. */
export const executionProvenanceV1Schema = z.object({
  schemaVersion: z.literal(1),
  jobInputSha256: digest,
  sourceSha256: digest,
  judgePolicyVersion: identifier,
  runtimeImageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  backend: identifier,
  workloadSeed: uint32,
  arena: z.object({
    id: identifier,
    version: identifier,
    manifestDigest: digest,
  }).strict().nullable(),
}).strict();

export type ExecutionProvenanceV1 = z.infer<typeof executionProvenanceV1Schema>;

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Stable across JSON object key order, including nested workload parameters. */
export function executionJobInputDigest(input: ExecutionJobInputV1): string {
  const parsed = executionJobInputV1Schema.parse(input);
  return sha256(canonicalJson(parsed));
}

/** Rejects a result that claims to belong to a different immutable run. */
export function verifyExecutionProvenance(
  input: ExecutionJobInputV1,
  candidate: unknown,
): ExecutionProvenanceV1 {
  const job = executionJobInputV1Schema.parse(input);
  const provenance = executionProvenanceV1Schema.parse(candidate);
  const expectedArena = job.kind === "arena" ? job.arena : null;
  if (
    provenance.jobInputSha256 !== executionJobInputDigest(job) ||
    provenance.sourceSha256 !== job.sourceSha256 ||
    provenance.judgePolicyVersion !== job.judgePolicyVersion ||
    provenance.workloadSeed !== job.workload.seed ||
    canonicalJson(provenance.arena) !== canonicalJson(expectedArena)
  ) {
    throw new Error("Execution provenance does not match the accepted job");
  }
  return provenance;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
