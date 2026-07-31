import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionToken } from "@/lib/variants";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · ByteArena",
  description: "Your submission history and best scores.",
};

export const dynamic = "force-dynamic";

interface SubmissionRow {
  id: string;
  status: string;
  language: string;
  createdAt: Date;
  challenge: {
    slug: string;
    title: string;
    difficulty: string;
    category: string;
  };
  result: {
    passed: boolean;
    score: number;
  } | null;
}

export default async function DashboardPage() {
  const sessionToken = await getSessionToken();

  let submissions: SubmissionRow[] = [];
  let bestPerChallenge: { title: string; slug: string; difficulty: string; category: string; bestScore: number; attempts: number; passed: boolean }[] = [];

  if (sessionToken) {
    const raw = await prisma.submission.findMany({
      where: { sessionId: sessionToken },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        language: true,
        createdAt: true,
        challenge: {
          select: {
            slug: true,
            title: true,
            difficulty: true,
            category: true,
          },
        },
        result: {
          select: { passed: true, score: true },
        },
      },
    });
    submissions = raw as SubmissionRow[];

    // Compute best score per challenge.
    const byChallenge = new Map<string, { title: string; slug: string; difficulty: string; category: string; bestScore: number; attempts: number; passed: boolean }>();
    for (const s of submissions) {
      if (!s.result) continue;
      const key = s.challenge.slug;
      const existing = byChallenge.get(key);
      if (!existing) {
        byChallenge.set(key, {
          title: s.challenge.title,
          slug: s.challenge.slug,
          difficulty: s.challenge.difficulty,
          category: s.challenge.category,
          bestScore: s.result.score,
          attempts: 1,
          passed: s.result.passed,
        });
      } else {
        existing.attempts++;
        if (s.result.score > existing.bestScore) {
          existing.bestScore = s.result.score;
          existing.passed = s.result.passed;
        }
      }
    }
    bestPerChallenge = Array.from(byChallenge.values()).sort((a, b) => b.bestScore - a.bestScore);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {sessionToken
            ? "Your submission history for this session. Sign in to keep it across devices."
            : "No session yet. Solve a challenge to start building your history."}
        </p>
      </header>

      {bestPerChallenge.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
            Best scores
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {bestPerChallenge.map((c) => (
              <Link
                key={c.slug}
                href={`/challenges/${c.slug}`}
                className="group rounded-lg border border-edge bg-surface p-4 transition-colors hover:border-signal/40"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-ink">
                      {c.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <DifficultyBadge difficulty={c.difficulty as never} />
                      <Badge variant="neutral">{c.category}</Badge>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p className="font-mono text-lg font-semibold text-ink">
                      {c.bestScore}
                    </p>
                    <p className="font-mono text-[10px] text-ink-muted">
                      / 100
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>{c.attempts} attempt{c.attempts === 1 ? "" : "s"}</span>
                  <span className="inline-flex items-center gap-1 text-ink-secondary group-hover:text-signal">
                    {c.passed ? "Passed" : "In progress"}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
          Recent submissions
        </h2>
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-edge bg-surface p-8 text-center">
            <p className="text-sm text-ink-muted">
              No submissions yet.{" "}
              <Link href="/challenges" className="text-signal hover:underline">
                Browse challenges →
              </Link>
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-edge">
            <table className="w-full text-sm">
              <thead className="bg-elevated/50">
                <tr className="text-left text-[11px] uppercase tracking-wider text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Challenge</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Score</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/50">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-elevated/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/challenges/${s.challenge.slug}`}
                        className="font-medium text-ink hover:text-signal"
                      >
                        {s.challenge.title}
                      </Link>
                      <p className="text-[10px] text-ink-muted">
                        {s.challenge.category} · {s.language}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} passed={s.result?.passed} />
                    </td>
                    <td className="px-4 py-3 font-mono text-ink-secondary">
                      {s.result ? s.result.score : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <time dateTime={s.createdAt.toISOString()}>
                        {formatRelative(s.createdAt)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status, passed }: { status: string; passed?: boolean }) {
  if (status === "COMPLETED" && passed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-signal">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Passed
      </span>
    );
  }
  if (status === "COMPLETED" || status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-warning">
        <XCircle className="h-3.5 w-3.5" />
        Failed
      </span>
    );
  }
  if (status === "RUNNING" || status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
        <Clock className="h-3.5 w-3.5" />
        {status === "PENDING" ? "Queued" : "Running"}
      </span>
    );
  }
  return (
    <span className="text-xs text-ink-muted">{status}</span>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return date.toLocaleDateString();
}
