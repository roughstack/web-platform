import { prisma } from "@/lib/db";
import { getExecutionBackend } from "./backend";

/**
 * startExecution kicks off an asynchronous run of the user's code against the
 * simulator. It returns immediately; the execution updates the submission
 * record and creates a Result when it finishes.
 *
 * In production this enqueues onto a job queue and a worker picks it up. For
 * the MVP it runs in-process, which is fine for low volume.
 */
export function startExecution(opts: {
  submissionId: string;
  code: string;
  language: string;
  seed: number;
  operations: number;
  blocks: number;
  pagesPerBlock: number;
  overProvisionBlocks: number;
  logicalPages: number;
  hotFraction: number;
  hotProbability: number;
  timeoutSec: number;
}): void {
  // Fire and forget. Errors are caught and written to the submission record.
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

async function executeSubmission(opts: {
  submissionId: string;
  code: string;
  language: string;
  seed: number;
  operations: number;
  blocks: number;
  pagesPerBlock: number;
  overProvisionBlocks: number;
  logicalPages: number;
  hotFraction: number;
  hotProbability: number;
  timeoutSec: number;
}): Promise<void> {
  const backend = getExecutionBackend();

  await prisma.submission.update({
    where: { id: opts.submissionId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  const result = await backend.execute({
    code: opts.code,
    language: opts.language,
    seed: opts.seed,
    operations: opts.operations,
    blocks: opts.blocks,
    pagesPerBlock: opts.pagesPerBlock,
    overProvisionBlocks: opts.overProvisionBlocks,
    logicalPages: opts.logicalPages,
    hotFraction: opts.hotFraction,
    hotProbability: opts.hotProbability,
    timeoutSec: opts.timeoutSec,
  });

  await prisma.result.create({
    data: {
      submissionId: opts.submissionId,
      passed: result.passed,
      score: result.score,
      executionTimeMs: result.executionTimeMs,
      metrics: result.metrics,
      testResults: JSON.parse(
        JSON.stringify({
          source: "local-docker",
          finalState: result.finalState ?? [],
          adversarial: result.adversarial ?? null,
        }),
      ),
      stderr: result.error ?? null,
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
