import Link from "next/link";
import { ArrowRight, Cpu, Clock, FileCode } from "lucide-react";

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
  const firstExperiment = allChallenges.find((challenge) => challenge.slug === "cache-pressure-easy") ?? allChallenges[0];

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-17">
      <header className="relative mb-10 overflow-hidden rounded-24 border border-[#b3c5ed] bg-[#dfeaff] px-6 py-9 sm:px-10 sm:py-11">
        <div aria-hidden="true" className="grid-backdrop pointer-events-none absolute inset-0 opacity-45" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2447e7_0%,#2447e7_46%,#ff784f_46%,#ff784f_74%,#0b977e_74%)]" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-10">
          <div>
            <Eyebrow><Cpu className="size-3.5" aria-hidden="true" /> Systems lab / choose an experiment</Eyebrow>
            <h1 className="mt-4 max-w-[14ch] text-[clamp(2.4rem,5vw,4.3rem)] leading-[1.06] font-bold tracking-[-.045em] text-ink">
              Pick a system. See how it behaves.
            </h1>
            <p className="mt-4 max-w-2xl text-regular text-body">
              Explore the idea in a diagram, implement the missing piece, then
              run it and see what your decisions changed. Start anywhere that
              sparks your curiosity.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-micro font-semibold text-body">
              {practiceCount > 0 && <span className="rounded-full border border-[#a9bdfa] bg-panel px-3 py-1.5">{practiceCount} practice labs</span>}
              {rankedCount > 0 && <span className="rounded-full border border-[#a9bdfa] bg-panel px-3 py-1.5">{rankedCount} ranked challenges</span>}
            </div>
          </div>
          {firstExperiment && (
            <Link href={`/challenges/${firstExperiment.slug}`} className="group overflow-hidden rounded-16 border border-[#a9bdfa] bg-panel shadow-[6px_6px_0_#2447e7] transition-transform duration-200 motion-safe:hover:-translate-y-1">
              <div className="flex items-center justify-between border-b border-edge px-4 py-2 font-mono text-tiny font-bold tracking-[.08em] text-body uppercase">
                <span>Suggested first experiment</span>
                <span className="text-link">01 / start</span>
              </div>
              <ChallengeArtwork slug={firstExperiment.slug} className="h-40 transition-transform duration-300 group-hover:scale-[1.04]" />
              <span className="flex items-center justify-between gap-2 px-4 py-3 text-small font-bold text-ink">
                {firstExperiment.title}
                <ArrowRight className="size-4 shrink-0 text-link transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          )}
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
                  <div className="relative h-37 overflow-hidden border-b border-edge sm:h-43">
                    <ChallengeArtwork slug={c.slug} className="transition-transform duration-300 group-hover:scale-[1.04]" />
                    <span aria-hidden="true" className="absolute right-3 bottom-3 size-2 rounded-full border border-ink bg-voltage shadow-[2px_2px_0_#172730]" />
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
