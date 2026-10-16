import { describe, expect, it } from "vitest";

import {
  executionJobInputDigest,
  executionJobInputV1Schema,
  executionProvenanceV1Schema,
  sha256,
  verifyExecutionProvenance,
} from "@/lib/execution/job-contract";

const input = {
  schemaVersion: 1,
  kind: "arena",
  submissionId: "submission-1",
  challengeId: "challenge-1",
  language: "GO",
  sourceSha256: sha256("package main\n"),
  judgePolicyVersion: "practice-v1",
  limits: { timeSec: 30, memoryMiB: 512 },
  workload: {
    task: "arena:cache-pressure-easy",
    seed: 42,
    variant: {
      blocks: 16,
      pagesPerBlock: 64,
      logicalPages: 768,
      hotFraction: 0.2,
      hotProbability: 0.8,
    },
    params: { nested: { b: 2, a: 1 }, operations: 100 },
  },
  arena: {
    id: "cache-pressure-easy",
    version: "1.0.0",
    manifestDigest: sha256("manifest"),
  },
} as const;

describe("versioned execution contracts", () => {
  it("pins an arena and hashes the source without copying source into the job", () => {
    expect(executionJobInputV1Schema.parse(input)).toEqual(input);
    expect(JSON.stringify(input)).not.toContain("package main");
    expect(input.sourceSha256).toBe(sha256("package main\n"));
  });

  it("rejects unpinned arenas, unexpected fields, and invalid workload seeds", () => {
    const unpinned = Object.fromEntries(Object.entries(input).filter(([key]) => key !== "arena"));
    expect(() => executionJobInputV1Schema.parse(unpinned)).toThrow();
    expect(() => executionJobInputV1Schema.parse({ ...input, sessionToken: "private" })).toThrow();
    expect(() => executionJobInputV1Schema.parse({
      ...input, workload: { ...input.workload, seed: -1 },
    })).toThrow();
  });

  it("produces a stable digest for reordered nested JSON keys", () => {
    const reordered = {
      ...input,
      workload: {
        ...input.workload,
        params: { operations: 100, nested: { a: 1, b: 2 } },
      },
    };
    expect(executionJobInputDigest(reordered)).toBe(executionJobInputDigest(input));
    expect(executionJobInputDigest({ ...input, sourceSha256: sha256("different") }))
      .not.toBe(executionJobInputDigest(input));
  });

  it("requires execution provenance to identify the backend and immutable image", () => {
    const provenance = {
      schemaVersion: 1,
      jobInputSha256: executionJobInputDigest(input),
      sourceSha256: input.sourceSha256,
      judgePolicyVersion: input.judgePolicyVersion,
      runtimeImageDigest: `sha256:${sha256("image")}`,
      backend: "isolated-worker",
      workloadSeed: input.workload.seed,
      arena: input.arena,
    };
    expect(executionProvenanceV1Schema.parse(provenance)).toEqual(provenance);
    expect(verifyExecutionProvenance(input, provenance)).toEqual(provenance);
    expect(() => executionProvenanceV1Schema.parse({ ...provenance, runtimeImageDigest: "latest" })).toThrow();
    expect(() => verifyExecutionProvenance(input, { ...provenance, workloadSeed: 43 })).toThrow(/does not match/);
    expect(() => verifyExecutionProvenance(input, {
      ...provenance, arena: { ...provenance.arena, version: "2.0.0" },
    })).toThrow(/does not match/);
  });
});
