import { prisma } from "@/lib/db";
import { getExecutionBackend, type ExecutionRequest } from "./backend";
import { computeScore, scoredMetricsFrom } from "@/lib/scoring";
import type { VariantParams } from "@/lib/variants";

/**
 * startExecution kicks off an asynchronous run of a submission and returns
 * immediately. The execution updates the submission record and creates a
 * Result when it finishes.
 *
 * In production this enqueues onto a job queue and a worker picks it up. For
 * now it runs in-process, which is fine at this volume.
 */
export interface ExecutionOptions {
  submissionId: string;
  challengeId: string;
  code: string;
  language: string;
  /** Per-session geometry, so two people never solve the identical instance. */
  variant: VariantParams;
}

export function startExecution(opts: ExecutionOptions): void {
  // Fire and forget. Errors are caught and written to the submission record,
  // because a submission stuck in RUNNING forever is worse than a failed one.
  void executeSubmission(opts).catch(async (e) => {
    await prisma.submission.update({
      where: { id: opts.submissionId },
      data: {
        status: "FAILED",
        error: e instanceof Error ? e.message : "Unknown execution error",
        finishedAt: new Date(),
      },
    });
  });
}

async function executeSubmission(opts: ExecutionOptions): Promise<void> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: opts.challengeId },
    select: {
      task: true,
      taskParams: true,
      metricsConfig: true,
      timeLimitSec: true,
    },
  });

  if (!challenge) {
    throw new Error("The challenge disappeared between submitting and running");
  }

  const backend = getExecutionBackend();

  await prisma.submission.update({
    where: { id: opts.submissionId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const result = await backend.execute({
    code: opts.code,
    language: opts.language,
    task: challenge.task,
    timeoutSec: challenge.timeLimitSec,
    ...workloadFor(challenge.task, challenge.taskParams, opts.variant),
  });

  const score = result.passed
    ? computeScore(
        result.metrics,
        result.baseline,
        scoredMetricsFrom(challenge.metricsConfig),
      )
    : 0;

  await prisma.result.create({
    data: {
      submissionId: opts.submissionId,
      passed: result.passed,
      score,
      executionTimeMs: result.executionTimeMs,
      metrics: result.metrics,
      testResults: JSON.parse(
        JSON.stringify({
          task: challenge.task,
          detail: result.detail ?? null,
          baseline: result.baseline,
          console: result.console ?? "",
        }),
      ),
      stderr: result.buildErrors ?? result.error ?? null,
    },
  });

  await prisma.submission.update({
    where: { id: opts.submissionId },
    data: {
      status: result.passed ? "COMPLETED" : "FAILED",
      error: result.error,
      finishedAt: new Date(),
    },
  });
}

/**
 * workloadFor decides the parameters one run is graded on.
 *
 * Two things feed in. The challenge's stored taskParams say what the problem
 * is — how many slots, how many operations. The session variant says which
 * instance of it this person gets, so a solution tuned to one visitor's device
 * does not transfer to another's. The variant wins on the dimensions it
 * covers; the challenge fills in the rest.
 *
 * Tasks that do not model a device ignore the geometry entirely, so passing it
 * along costs nothing and keeps this free of per-task branching beyond the
 * seed derivation.
 */
type Workload = Omit<
  ExecutionRequest,
  "code" | "language" | "task" | "timeoutSec"
>;

function workloadFor(
  task: string,
  taskParams: unknown,
  variant: VariantParams,
): Workload {
  const params = (taskParams ?? {}) as Record<string, number | undefined>;

  const base: Workload = {
    seed: variant.seed,
    operations: params.operations,
    overProvisionBlocks: params.overProvisionBlocks,
    slots: params.slots,
    liveFraction: params.liveFraction,
  };

  // Compaction is a flat array with no device behind it, so handing it a page
  // geometry would only invite the runner to validate flags it ignores.
  if (task === "compaction") return base;

  return {
    ...base,
    blocks: variant.blocks,
    pagesPerBlock: variant.pagesPerBlock,
    logicalPages: variant.logicalPages,
    hotFraction: variant.hotFraction,
    hotProbability: variant.hotProbability,
  };
}
