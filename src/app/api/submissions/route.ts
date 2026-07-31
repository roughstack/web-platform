import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { startExecution } from "@/lib/execution/runner";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    slug?: string;
    code?: string;
    language?: string;
  };

  if (!body.slug || !body.code || !body.language) {
    return NextResponse.json(
      { error: "slug, code, and language are required" },
      { status: 400 },
    );
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug: body.slug, isPublished: true },
    select: {
      id: true,
      languages: true,
      timeLimitSec: true,
      memoryLimitMb: true,
    },
  });

  if (!challenge) {
    return NextResponse.json(
      { error: "Challenge not found" },
      { status: 404 },
    );
  }

  if (!challenge.languages.includes(body.language as never)) {
    return NextResponse.json(
      { error: `Language ${body.language} is not supported by this challenge` },
      { status: 400 },
    );
  }

  const session = await getServerSession();
  const userId = session?.user?.id;

  const submission = await prisma.submission.create({
    data: {
      challengeId: challenge.id,
      userId: userId ?? null,
      language: body.language as never,
      code: body.code,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Kick off asynchronous execution. The workload is tuned to trigger
  // garbage collection: 5000 operations against a device with 16 addressable
  // blocks × 64 pages = 1024 addressable pages and 2 OP blocks × 64 = 128 OP
  // pages, with 512 logical pages and an 80/20 hot/cold split. This forces
  // frequent reclamation and separates good policies from bad ones.
  startExecution({
    submissionId: submission.id,
    code: body.code,
    language: body.language,
    seed: 42,
    operations: 5000,
    blocks: 16,
    pagesPerBlock: 64,
    overProvisionBlocks: 2,
    logicalPages: 512,
    hotFraction: 0.2,
    hotProbability: 0.8,
    timeoutSec: challenge.timeLimitSec,
  });

  return NextResponse.json({ id: submission.id });
}
