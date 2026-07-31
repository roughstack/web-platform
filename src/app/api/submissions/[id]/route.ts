import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// For MVP, this endpoint returns a synthetic result so the full UI flow
// (submit → poll → render) is testable end-to-end before the real execution
// backend exists. When the runner is wired, this will read the actual status
// from the submission record and the execution backend will update it.
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
      challenge: {
        select: { referenceMetrics: true },
      },
      result: true,
    },
  });

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 },
    );
  }

  // If a real result already exists (from the execution backend), return it.
  if (submission.result) {
    const r = submission.result;
    return NextResponse.json({
      status: "done",
      result: {
        status: r.passed ? "passed" : "failed",
        score: r.score,
        metrics: r.metrics as Record<string, number>,
        message: undefined,
      },
    });
  }

  // Synthetic result: on the first poll, mark as running; on the second,
  // return a result derived from the reference metrics with a deterministic
  // perturbation so the UI has something to render. This will be replaced
  // by the real execution backend.
  if (submission.status === "PENDING") {
    await prisma.submission.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    });
    return NextResponse.json({ status: "running" });
  }

  if (submission.status === "RUNNING") {
    const reference = (submission.challenge.referenceMetrics ?? {}) as Record<
      string,
      number
    >;

    // Deterministic pseudo-metrics: 5-15% worse than reference, seeded by
    // submission id length so different submissions show different numbers.
    const seed = submission.id.length;
    const factor = 1 + (0.05 + (seed % 10) / 100);
    const metrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(reference)) {
      metrics[k] = Math.round(v * factor * 100) / 100;
    }

    const score = Math.max(40, Math.round(100 - (factor - 1) * 200));
    const passed = score >= 60;

    await prisma.result.create({
      data: {
        submissionId: submission.id,
        passed,
        score,
        executionTimeMs: 1200 + (seed % 500),
        metrics,
        testResults: { synthetic: true },
      },
    });

    await prisma.submission.update({
      where: { id },
      data: { status: "COMPLETED", finishedAt: new Date() },
    });

    return NextResponse.json({
      status: "done",
      result: {
        status: passed ? "passed" : "failed",
        score,
        metrics,
        message: "Synthetic result — execution backend not yet connected.",
      },
    });
  }

  // DONE with no result (shouldn't happen, but handle gracefully)
  return NextResponse.json({
    status: "done",
    result: {
      status: "failed",
      score: 0,
      metrics: {},
      message: "No result recorded.",
    },
  });
}
