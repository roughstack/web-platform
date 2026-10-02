import Link from "next/link";
import { ArrowRight, Cpu, Clock, MemoryStick, FileCode } from "lucide-react";

import {
  loadArenaChallengeCards,
  type ArenaChallengeCard,
} from "@/lib/arena/challenge";
import { prisma } from "@/lib/db";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/label";

export const metadata = {
  title: "Challenges",
  description:
    "Hands-on systems engineering challenges. Implement real firmware, scored on real metrics.",
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
    [...challenges, ...arenas].map((challenge) => [challenge.slug, challenge]),
  );
  const allChallenges = [...bySlug.values()];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="mb-12">
        <Eyebrow>Challenges</Eyebrow>
        <h1 className="mt-4 text-title-4 text-balance sm:text-title-5">
          Systems engineering, executed.
        </h1>
        <p className="mt-4 max-w-2xl text-regular text-muted">
          Each challenge gives you a real subsystem to implement — a flash
          translation layer, a write-ahead log, a scheduler — and scores your
          solution against metrics that matter in production: amplification,
          latency, fairness, durability.
        </p>
      </header>

      {allChallenges.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-mini text-muted">
            No challenges published yet. Check back soon.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {allChallenges.map((c) => (
            <li key={c.slug}>
              <Link href={`/challenges/${c.slug}`} className="group block">
                <Card interactive className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={c.difficulty} />
                        <Badge variant="neutral">{c.category}</Badge>
                      </div>
                      <h2 className="text-title-2">{c.title}</h2>
                      <p className="mt-2 text-mini text-muted">{c.summary}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-micro text-quiet">
                        <span className="inline-flex items-center gap-1.5">
                          <FileCode className="size-3.5" aria-hidden="true" />
                          {c.languages.map(titleCase).join(", ")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {c.timeLimitSec}s limit
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <MemoryStick
                            className="size-3.5"
                            aria-hidden="true"
                          />
                          {c.memoryLimitMb} MB
                        </span>
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center text-quiet transition-colors duration-100 group-hover:text-ink sm:mt-1"
                    >
                      <ArrowRight className="size-5" />
                    </span>
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
            <h2 className="text-title-1">How scoring works</h2>
            <p className="mt-2 text-mini text-muted">
              Solutions are graded on a deterministic, seeded workload so every
              submission faces identical traffic. Metrics are compared against a
              reference solution and a clairvoyant lower bound. Your score is a
              weighted ratio — beat the reference to score above 100.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
