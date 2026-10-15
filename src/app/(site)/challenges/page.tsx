import Link from "next/link";
import { ArrowRight, Cpu, Clock, FileCode } from "lucide-react";

import {
  loadArenaChallengeCards,
  type ArenaChallengeCard,
} from "@/lib/arena/challenge";
import { prisma } from "@/lib/db";
import { Badge, DifficultyBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

const PATHWAYS = [
  {
    id: "memory",
    number: "01",
    title: "Memory has a cost.",
    question: "What deserves to stay close when space runs out?",
    tone: "bg-[#c7ff65]",
    slugs: ["cache-pressure-easy", "cache-pressure-medium"],
  },
  {
    id: "storage",
    number: "02",
    title: "Data has to survive.",
    question: "What happens when writes stop, blocks wear out, or data moves?",
    tone: "bg-[#ffc6b6]",
    slugs: ["compaction", "victim-selection", "wear-levelling", "journal-recovery-easy", "chunk-store-easy", "lsm-compactor-easy"],
  },
  {
    id: "coordination",
    number: "03",
    title: "Work needs a policy.",
    question: "Who goes next, and what happens when everyone arrives at once?",
    tone: "bg-[#b6d9ff]",
    slugs: ["deadline-scheduler-easy", "durable-queue-easy", "fair-gate-easy"],
  },
  {
    id: "data-in-motion",
    number: "04",
    title: "Signals move through noise.",
    question: "Can you keep meaning intact across packets and event streams?",
    tone: "bg-[#cbbdff]",
    slugs: ["lossy-link-easy", "stream-windows-easy"],
  },
] as const;

const CARD_QUESTIONS: Record<string, string> = {
  "cache-pressure-easy": "Which item leaves when the cache fills?",
  "cache-pressure-medium": "What changes when entries have different sizes and lifetimes?",
  compaction: "How little can you move to close the gaps?",
  "victim-selection": "Which flash block is worth reclaiming?",
  "wear-levelling": "Can you reclaim space without wearing one block out?",
  "journal-recovery-easy": "Which writes are still real after a crash?",
  "chunk-store-easy": "Can a tiny chunk answer a large random read?",
  "lsm-compactor-easy": "When should sorted runs become one?",
  "deadline-scheduler-easy": "Which job should a single worker take next?",
  "durable-queue-easy": "What happens when producers outrun workers?",
  "fair-gate-easy": "Which request gets through the gate?",
  "lossy-link-easy": "Can a byte stream survive a bad connection?",
  "stream-windows-easy": "When is an event-time window truly final?",
};

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
  const pathways = PATHWAYS.map((pathway) => ({
    ...pathway,
    challenges: pathway.slugs.flatMap((slug) => {
      const challenge = bySlug.get(slug);
      return challenge ? [challenge] : [];
    }),
  })).filter((pathway) => pathway.challenges.length > 0);
  const mappedSlugs = new Set<string>(PATHWAYS.flatMap((pathway) => pathway.slugs));
  const additionalChallenges = allChallenges.filter((challenge) => !mappedSlugs.has(challenge.slug));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-17">
      <header className="relative mb-14 overflow-hidden rounded-[2rem] border border-[#223565] bg-[#142347] px-6 py-9 text-white sm:px-10 sm:py-11">
        <div aria-hidden="true" className="absolute right-[-6rem] top-[-8rem] size-[24rem] rounded-full border-[5rem] border-[#3154f4]/50" />
        <div aria-hidden="true" className="absolute bottom-[-12rem] left-[25%] size-[20rem] rounded-full bg-[#3154f4]/35 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr] lg:gap-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#a8c8ff]/35 bg-white/10 px-3 py-1.5 font-mono text-micro font-bold tracking-[.08em] text-[#c7ff65] uppercase"><Cpu className="size-3.5" aria-hidden="true" /> The system is yours to build</p>
            <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[1.03] font-bold tracking-[-.05em] text-white">
              Follow your curiosity down the stack.
            </h1>
            <p className="mt-4 max-w-2xl text-regular text-[#d9e5ff]">
              Memory, storage, coordination, networks. Pick a question, build the missing piece, and run your code against a real workload.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-micro font-semibold text-[#e9efff]">
              {practiceCount > 0 && <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">{practiceCount} practice labs</span>}
              {rankedCount > 0 && <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5">{rankedCount} ranked challenges</span>}
            </div>
          </div>
          {firstExperiment && (
            <Link href={`/challenges/${firstExperiment.slug}`} className="group overflow-hidden rounded-16 border border-[#a9bdfa] bg-panel shadow-[7px_7px_0_#c7ff65] transition-transform duration-200 motion-safe:hover:-translate-y-1">
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
        <div className="space-y-16">
          {pathways.map((pathway) => (
            <section key={pathway.id} aria-labelledby={`pathway-${pathway.id}`}>
              <div className={`mb-5 flex flex-col gap-3 rounded-20 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7 ${pathway.tone}`}>
                <div>
                  <p className="font-mono text-xs font-black tracking-[.12em] text-[#15223a] uppercase">{pathway.number} / {pathway.id.replaceAll("-", " ")}</p>
                  <h2 id={`pathway-${pathway.id}`} className="mt-1 font-display text-title-3 font-bold text-[#15223a] sm:text-title-4">{pathway.title}</h2>
                </div>
                <p className="max-w-sm text-sm font-semibold text-[#25324a]">{pathway.question}</p>
              </div>
              <ul className="grid gap-5 md:grid-cols-2">
                {pathway.challenges.map((c) => (
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
                    <h3 className="mt-4 font-display text-title-2">{c.title}</h3>
                    <p className="mt-2 text-mini font-semibold text-ink">{CARD_QUESTIONS[c.slug] ?? "What will your implementation change?"}</p>
                    <p className="mt-2 flex-1 text-mini text-muted line-clamp-2">{c.summary}</p>
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
            </section>
          ))}
          {additionalChallenges.length > 0 && (
            <section aria-labelledby="more-challenges">
              <h2 id="more-challenges" className="mb-5 text-title-3">More to explore</h2>
              <ul className="grid gap-5 md:grid-cols-2">{additionalChallenges.map((c) => <li key={c.slug}><Link href={`/challenges/${c.slug}`} className="group block h-full rounded-20 border border-edge bg-panel p-6 hover:border-accent"><div className="flex flex-wrap gap-2"><DifficultyBadge difficulty={c.difficulty} /><Badge variant="neutral">{c.category}</Badge></div><h3 className="mt-4 text-title-2">{c.title}</h3><p className="mt-2 text-mini text-muted">{c.summary}</p><span className="mt-5 inline-flex items-center gap-2 text-small font-semibold text-link">Open challenge <ArrowRight className="size-4" aria-hidden="true" /></span></Link></li>)}</ul>
            </section>
          )}
        </div>
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
