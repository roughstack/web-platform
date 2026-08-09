import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { authorLabelFor, validateReply } from "@/lib/discussion";
import { checkRateLimit, msUntilReset } from "@/lib/rate-limit";
import { getWorkloadVariant } from "@/lib/variants";

/** A thread is a conversation, not a feed, so it is not paginated yet. */
const MAX_REPLIES_RETURNED = 100;

/** Posting is deliberately slower than reading. */
const MAX_REPLIES_PER_MINUTE = 3;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const challenge = await prisma.challenge.findUnique({
    where: { slug, isPublished: true },
    select: { id: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const variant = await getWorkloadVariant();

  const replies = await prisma.reply.findMany({
    where: { challengeId: challenge.id, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: MAX_REPLIES_RETURNED,
    select: {
      id: true,
      authorLabel: true,
      body: true,
      isSpoiler: true,
      sessionId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    replies: replies.map((reply) => ({
      id: reply.id,
      author: reply.authorLabel,
      body: reply.body,
      isSpoiler: reply.isSpoiler,
      createdAt: reply.createdAt.toISOString(),
      // Lets the client offer a delete affordance on the visitor's own replies
      // without ever exposing another visitor's session.
      isMine: reply.sessionId === variant.sessionToken,
    })),
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const body = (await req.json().catch(() => ({}))) as {
    body?: unknown;
    isSpoiler?: unknown;
  };

  if (typeof body.body !== "string") {
    return NextResponse.json({ error: "A reply body is required" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const rateKey = `reply:${ip}`;
  if (!checkRateLimit(rateKey, MAX_REPLIES_PER_MINUTE)) {
    const retry = Math.ceil(msUntilReset(rateKey) / 1000);
    return NextResponse.json(
      { error: `You are posting quickly. Try again in ${retry}s.` },
      { status: 429 },
    );
  }

  // The same rules the composer applies while typing. Re-checked here because
  // a client-side check is a courtesy, not a control.
  const validation = validateReply(body.body);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.message, reason: validation.reason },
      { status: 422 },
    );
  }

  const challenge = await prisma.challenge.findUnique({
    where: { slug, isPublished: true },
    select: { id: true },
  });
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const variant = await getWorkloadVariant();
  const sessionId = variant.sessionToken;

  const reply = await prisma.reply.create({
    data: {
      challengeId: challenge.id,
      sessionId,
      authorLabel: authorLabelFor(sessionId),
      body: body.body.trim(),
      isSpoiler: body.isSpoiler === true,
    },
    select: {
      id: true,
      authorLabel: true,
      body: true,
      isSpoiler: true,
      createdAt: true,
    },
  });

  return NextResponse.json(
    {
      reply: {
        id: reply.id,
        author: reply.authorLabel,
        body: reply.body,
        isSpoiler: reply.isSpoiler,
        createdAt: reply.createdAt.toISOString(),
        isMine: true,
      },
    },
    { status: 201 },
  );
}
