import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Arena } from "@/components/arena/arena";
import { DifficultyBadge, Badge } from "@/components/ui/badge";
import { Clock, MemoryStick } from "lucide-react";

export const dynamic = "force-dynamic";

async function getChallenge(slug: string) {
  return prisma.challenge.findUnique({
    where: { slug, isPublished: true },
    select: {
      slug: true,
      title: true,
      summary: true,
      description: true,
      difficulty: true,
      category: true,
      languages: true,
      starterCode: true,
      interfaceDoc: true,
      timeLimitSec: true,
      memoryLimitMb: true,
      metricsConfig: true,
      referenceMetrics: true,
    },
  });
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = await getChallenge(slug);
  if (!challenge) notFound();

  const metricsConfig = challenge.metricsConfig as {
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      description: string;
      lowerIsBetter: boolean;
      weight: number;
    }>;
    scoring: { type: string; referenceSolution: string; passThreshold: number };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={challenge.difficulty} />
          <Badge variant="neutral">{challenge.category}</Badge>
          <span className="font-mono text-xs text-ink-muted">
            {challenge.languages
              .map((l) => l.charAt(0) + l.slice(1).toLowerCase())
              .join(", ")}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {challenge.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-secondary">
          {challenge.summary}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {challenge.timeLimitSec}s time limit
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MemoryStick className="h-3.5 w-3.5" />
            {challenge.memoryLimitMb} MB memory
          </span>
        </div>
      </header>

      <Arena
        slug={challenge.slug}
        description={challenge.description}
        interfaceDoc={challenge.interfaceDoc ?? ""}
        starterCode={
          (challenge.starterCode as Record<string, string>)[
            challenge.languages[0]
          ] ?? ""
        }
        language={challenge.languages[0]}
        metrics={metricsConfig.metrics}
        scoring={metricsConfig.scoring}
      />
    </div>
  );
}
