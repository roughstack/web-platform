import { notFound } from "next/navigation";

import { Arena, type LadderRung } from "@/components/arena/arena";
import type { MetricDef } from "@/components/arena/types";
import { parseBlocks } from "@/lib/blocks/types";
import { prisma } from "@/lib/db";
import { orderLanguages } from "@/lib/languages";

export const dynamic = "force-dynamic";

/**
 * The arena owns the whole viewport, so this page is deliberately thin: fetch,
 * shape, hand over. All the header material that used to sit above the
 * workspace now lives inside it, because scrolling past a masthead to reach the
 * editor was the single biggest waste of space in the old layout.
 */

interface MetricsConfig {
  readonly metrics?: readonly MetricDef[];
}

async function getChallenge(slug: string) {
  return prisma.challenge.findUnique({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      title: true,
      blocks: true,
      difficulty: true,
      task: true,
      ladder: true,
      languages: true,
      starterCode: true,
      metricsConfig: true,
    },
  });
}

/** The sibling rungs, so the arena can offer stepping up or down a level. */
async function getLadder(ladder: string): Promise<LadderRung[]> {
  const rungs = await prisma.challenge.findMany({
    where: { ladder, isPublished: true },
    orderBy: { tier: "asc" },
    select: { slug: true, title: true, difficulty: true, tier: true },
  });
  return rungs;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await prisma.challenge.findUnique({
    where: { slug, isPublished: true },
    select: { title: true, summary: true },
  });

  if (!challenge) return { title: "Challenge not found" };
  return { title: `${challenge.title} · ByteArena`, description: challenge.summary };
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await getChallenge(slug);
  if (!challenge) notFound();

  const ladder = await getLadder(challenge.ladder);
  const metricsConfig = (challenge.metricsConfig ?? {}) as MetricsConfig;

  return (
    <Arena
      slug={challenge.slug}
      title={challenge.title}
      difficulty={challenge.difficulty}
      task={challenge.task}
      blocks={parseBlocks(challenge.blocks)}
      languages={orderLanguages(challenge.languages)}
      starterCode={(challenge.starterCode ?? {}) as Record<string, string>}
      metrics={metricsConfig.metrics ?? []}
      ladder={ladder}
    />
  );
}
