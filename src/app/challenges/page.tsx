import Link from "next/link";
import { prisma } from "@/lib/db";
import { DifficultyBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Cpu, Clock, MemoryStick, FileCode } from "lucide-react";

export const metadata = {
  title: "Challenges — ByteArena",
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

export default async function ChallengesPage() {
  const challenges = await getChallenges();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-10 sm:mb-14">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-signal">
          Challenges
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Systems engineering, executed.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary sm:text-base">
          Each challenge gives you a real subsystem to implement — a flash
          translation layer, a write-ahead log, a scheduler — and scores your
          solution against metrics that matter in production: amplification,
          latency, fairness, durability.
        </p>
      </header>

      {challenges.length === 0 ? (
        <div className="rounded-lg border border-edge bg-surface p-8 text-center">
          <p className="font-mono text-sm text-ink-muted">
            No challenges published yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {challenges.map((c) => (
            <Link
              key={c.slug}
              href={`/challenges/${c.slug}`}
              className="group block rounded-lg border border-edge bg-surface p-5 transition-colors hover:border-edge-strong hover:bg-elevated sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={c.difficulty} />
                    <Badge variant="neutral">{c.category}</Badge>
                  </div>
                  <h2 className="text-lg font-medium text-ink sm:text-xl">
                    {c.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                    {c.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <FileCode className="h-3.5 w-3.5" />
                      {c.languages.map((l) => l.charAt(0) + l.slice(1).toLowerCase()).join(", ")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {c.timeLimitSec}s limit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MemoryStick className="h-3.5 w-3.5" />
                      {c.memoryLimitMb} MB
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center text-ink-muted transition-colors group-hover:text-signal sm:mt-1">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-12 rounded-lg border border-edge bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          <div>
            <h3 className="text-sm font-medium text-ink">How scoring works</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
              Solutions are graded on a deterministic, seeded workload so every
              submission faces identical traffic. Metrics are compared against
              a reference solution and a clairvoyant lower bound. Your score is
              a weighted ratio — beat the reference to score above 100.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
