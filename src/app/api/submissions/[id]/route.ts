import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * What the runner stored for this attempt.
 *
 * `detail` is deliberately opaque here. Its shape depends on which task ran —
 * a slot array for compaction, a block grid for the device rungs — and this
 * route's job is to hand it to the arena unopened, not to know the difference.
 * Naming the variants here is how the previous version ended up only able to
 * report results for a single challenge.
 */
interface StoredResults {
  task?: string;
  detail?: unknown;
  console?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      error: true,
      result: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  // If a result exists, return it regardless of the submission status.
  if (submission.result) {
    const r = submission.result;
    const stored = (r.testResults ?? {}) as StoredResults;

    return NextResponse.json({
      status: "done",
      result: {
        status: r.passed ? "passed" : "failed",
        score: r.score,
        metrics: r.metrics as Record<string, number>,
        message: r.stderr ?? undefined,
        console: stored.console ?? "",
        detail: stored.detail ?? null,
      },
    });
  }

  // Map the submission status to the polling protocol.
  switch (submission.status) {
    case "PENDING":
      return NextResponse.json({ status: "queued" });
    case "RUNNING":
      return NextResponse.json({ status: "running" });
    case "FAILED":
      return NextResponse.json({
        status: "error",
        error: submission.error ?? "Execution failed",
      });
    case "COMPLETED":
      // COMPLETED with no result record shouldn't happen, but handle it.
      return NextResponse.json({
        status: "done",
        result: {
          status: "failed",
          score: 0,
          metrics: {},
          message: "No result recorded.",
        },
      });
    case "TIMEOUT":
      return NextResponse.json({
        status: "error",
        error: "Execution timed out",
      });
    default:
      return NextResponse.json({ status: "queued" });
  }
}
