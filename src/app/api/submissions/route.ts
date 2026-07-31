import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth";
import { startExecution } from "@/lib/execution/runner";
import { getWorkloadVariant } from "@/lib/variants";
import { checkRateLimit, msUntilReset } from "@/lib/rate-limit";

const MAX_SUBMISSIONS_PER_MINUTE = 5;

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

  // Rate limit per IP (anti-AI Layer 3c). For logged-in users this should
  // also key on userId; for now, IP is the only stable identity.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const rateKey = `submit:${ip}`;
  if (!checkRateLimit(rateKey, MAX_SUBMISSIONS_PER_MINUTE)) {
    const retry = msUntilReset(rateKey);
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${Math.ceil(retry / 1000)}s.`,
      },
      { status: 429 },
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

  // Per-user workload variant (anti-AI Layer 1a): each session gets a
  // different seed and slightly different device geometry, so an
  // AI-generated solution for one user does not transfer to another.
  const variant = await getWorkloadVariant();

  startExecution({
    submissionId: submission.id,
    code: body.code,
    language: body.language,
    seed: variant.seed,
    operations: 5000,
    blocks: variant.blocks,
    pagesPerBlock: variant.pagesPerBlock,
    overProvisionBlocks: 2,
    logicalPages: variant.logicalPages,
    hotFraction: variant.hotFraction,
    hotProbability: variant.hotProbability,
    timeoutSec: challenge.timeLimitSec,
  });

  return NextResponse.json({ id: submission.id });
}
