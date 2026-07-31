import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "@/lib/auth";

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
    select: { id: true, languages: true },
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

  // For MVP, submissions are anonymous. Once auth is wired, getServerSession
  // will return the authenticated user and we attach their id here.
  const session = await getServerSession();
  const userId = session?.user?.id;

  const submission = await prisma.submission.create({
    data: {
      challengeId: challenge.id,
      user: userId ? { connect: { id: userId } } : undefined,
      language: body.language as never,
      code: body.code,
      status: "PENDING",
    },
    select: { id: true },
  });

  return NextResponse.json({ id: submission.id });
}
