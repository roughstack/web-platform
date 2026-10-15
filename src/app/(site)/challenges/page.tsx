import Link from "next/link";
import { ArrowRight, Cpu, Clock, FileCode, Sparkles } from "lucide-react";

import {
  loadArenaChallengeCards,
  type ArenaChallengeCard,
} from "@/lib/arena/challenge";
import { prisma } from "@/lib/db";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/label";
import { ChallengeArtwork } from "@/components/challenge-artwork";

export const metadata = {
  title: "Challenges",
  description:
    "Hands-on systems engineering challenges with runnable feedback and measurable behavior.",
};

export const dynamic = "force-dynamic";

async function getChallenges() {
  return prisma.challenge.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      title: true,
      summary: true,
      difficulty: true,
      category: true,
      pack: true,
      languages: true,
      timeLimitSec: true,
      memoryLimitMb: true,
    },
  });
}

async function getPublicArenas(): Promise<ArenaChallengeCard[]> {
  try {
    return await loadArenaChallengeCards();
  } catch {
    return [];
  }
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default async function ChallengesPage() {
  const [challenges, arenas] = await Promise.all([
    getChallenges(),
    getPublicArenas(),
  ]);
  const bySlug = new Map(
    [
      ...challenges.map((challenge) => ({ ...challenge, practice: challenge.pack === "arena" })),
      ...arenas.map((challenge) => ({ ...challenge, practice: true })),
    ].map((challenge) => [challenge.slug, challenge]),
  );
  const allChallenges = [...bySlug.values()];
  const practiceCount = allChallenges.filter((challenge) => challenge.practice).length;
  const rankedCount = allChallenges.length - practiceCount;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-17">
      <header className="relative mb-10 overflow-hidden rounded-24 border border-edge bg-[#fff3da] px-6 py-9 sm:px-10 sm:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-[#d5eaff] opacity-80 blur-3xl" />
        <div className="relative">
          <Eyebrow><Sparkles className="size-3.5" aria-hidden="true" /> Systems playground</Eyebrow>
          <h1 className="mt-4 max-w-[14ch] text-[clamp(2.4rem,5vw,4.3rem)] leading-[1.06] font-bold tracking-[-.045em] text-ink">
            Pick a system. See how it behaves.
          </h1>
          <p className="mt-4 max-w-2xl text-regular text-body">
            Explore the idea in a diagram, implement the missing piece, then
            run it and see what your decisions changed. Start anywhere that
            sparks your curiosity.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-micro font-medium text-muted">
            {practiceCount > 0 && <span className="rounded-full border border-edge bg-panel/80 px-3 py-1.5">{practiceCount} practice labs</span>}
            {rankedCount > 0 && <span className="rounded-full border border-edge bg-panel/80 px-3 py-1.5">{rankedCount} ranked challenges</span>}
          </div>
        </div>
      </header>

      {allChallenges.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-mini text-muted">
            No challenges published yet. Check back soon.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {allChallenges.map((c) => (
            <li key={c.slug}>
              <Link href={`/challenges/${c.slug}`} className="group block h-full">
                <Card interactive className="flex h-full flex-col overflow-hidden rounded-20">
                  <div className="h-37 overflow-hidden border-b border-edge sm:h-43">
                    <ChallengeArtwork slug={c.slug} className="transition-transform duration-300 group-hover:scale-[1.04]" />
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <DifficultyBadge difficulty={c.difficulty} />
                      <Badge variant="neutral">{c.category}</Badge>
                      <Badge variant={c.practice ? "accent" : "signal"}>{c.practice ? "Practice" : "Ranked"}</Badge>
                    </div>
                    <h2 className="mt-4 text-title-2">{c.title}</h2>
                    <p className="mt-2 flex-1 text-mini text-muted">{c.summary}</p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-edge pt-4 text-micro text-quiet">
                      <span className="inline-flex items-center gap-1.5"><FileCode className="size-3.5" aria-hidden="true" />{c.languages.map(titleCase).join(", ")}</span>
                      <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden="true" />{c.timeLimitSec}s limit</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-link">Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card variant="glass" className="mt-12 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Cpu
            className="mt-0.5 size-4 shrink-0 text-accent-hover"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-title-1">Practice or ranked?</h2>
            <p className="mt-2 text-mini text-muted">
              Each submission receives a verdict and workload measurements.
              The original flash-storage challenges have ranked scores. The
              newer systems challenges are practice exercises: their public
              metrics are useful feedback, but they are not calibrated for a
              leaderboard yet.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
