import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionToken } from "@/lib/variants";
import { Badge } from "@/components/ui/badge";
import { DifficultyBadge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { ChallengeArtwork } from "@/components/challenge-artwork";
import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: `Top scores across all ${PRODUCT_NAME} challenges.`,
};

export const dynamic = "force-dynamic";

interface LeaderboardEntry {
  rank: number;
  score: number;
  passed: boolean;
  challengeSlug: string;
  challengeTitle: string;
  difficulty: string;
  category: string;
  sessionId: string;
  isCurrentUser: boolean;
  submittedAt: Date;
}

export default async function LeaderboardPage() {
  const sessionToken = await getSessionToken();

  // Get the best score per (session, challenge) pair. We use a raw query
  // because Prisma's groupBy doesn't easily support "max score with
  // associated fields" in one pass.
  const rows = await prisma.$queryRaw<
    Array<{
      sessionId: string;
      challengeSlug: string;
      challengeTitle: string;
      difficulty: string;
      category: string;
      bestScore: number;
      passed: boolean;
      submittedAt: Date;
    }>
  >`
    SELECT
      s."sessionId",
      c.slug AS "challengeSlug",
      c.title AS "challengeTitle",
      c.difficulty::text AS "difficulty",
      c.category,
      MAX(r.score) AS "bestScore",
      BOOL_OR(r.passed) AS "passed",
      MAX(s."createdAt") AS "submittedAt"
    FROM "Submission" s
    JOIN "Result" r ON r."submissionId" = s.id
    JOIN "Challenge" c ON c.id = s."challengeId"
    WHERE s."sessionId" IS NOT NULL
      AND c."isPublished" = true
      AND c.pack <> 'arena'
    GROUP BY s."sessionId", c.slug, c.title, c.difficulty, c.category
    ORDER BY "bestScore" DESC, "submittedAt" ASC
    LIMIT 50
  `;

  const entries: LeaderboardEntry[] = rows.map((row, i) => ({
    rank: i + 1,
    score: row.bestScore,
    passed: row.passed,
    challengeSlug: row.challengeSlug,
    challengeTitle: row.challengeTitle,
    difficulty: row.difficulty,
    category: row.category,
    sessionId: row.sessionId,
    isCurrentUser: sessionToken === row.sessionId,
    submittedAt: row.submittedAt,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="mb-10 grid items-end gap-8 border-b border-edge pb-10 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-display text-5xl tracking-[-.04em] sm:text-6xl">Leaderboard</h1>
          <p className="mt-2 text-regular text-muted">
            Ranked flash-storage challenges only. Practice challenges are
            excluded until their scores are calibrated.{" "}
            {sessionToken
              ? "Your row is highlighted."
              : "Solve a challenge to appear."}
          </p>
        </div>
        <div className="rounded-2xl bg-[#f4ce57] px-7 py-5">
          <p className="font-mono text-4xl font-semibold text-ink">{entries.length}</p>
          <p className="mt-2 text-sm text-ink">Ranked results</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="grid items-center gap-6 rounded-3xl bg-[#fff0c2] p-7 sm:grid-cols-[1fr_1.2fr] sm:p-10">
          <ChallengeArtwork slug="compaction" className="aspect-[240/136] rounded-2xl" />
          <div>
            <h2 className="font-display text-3xl leading-tight tracking-tight">Make the first move.</h2>
            <p className="mt-3 text-base leading-relaxed text-body">No ranked submissions yet. Build a compaction policy, test it, and set the first score.</p>
            <Link href="/challenges/compaction" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-hover">Open Compaction</Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge bg-white">
          <table className="w-full min-w-[30rem] text-mini">
            <thead className="bg-[#e4eafb]">
              <tr className="text-left text-sm text-body">
                <th className="px-4 py-2.5 font-medium">#</th>
                <th className="px-4 py-2.5 font-medium">Challenge</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">
                  When
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {entries.map((e) => (
                <tr
                  key={`${e.sessionId}-${e.challengeSlug}`}
                  className={
                    e.isCurrentUser
                      ? "bg-accent/8 ring-1 ring-accent/25 ring-inset"
                      : "transition-colors duration-100 hover:bg-raised/40"
                  }
                >
                  <td className="px-4 py-3">
                    <span
                      className={
                        e.rank <= 3
                          ? "inline-grid size-9 place-items-center rounded-full bg-[#f4ce57] font-mono text-mini font-semibold tabular-nums text-ink"
                          : "font-mono text-mini tabular-nums text-quiet"
                      }
                    >
                      {e.rank}
                    </span>
                  </td>
                  {/* py-1.5 rather than py-3: the link below carries its own
                      44px touch height, which would otherwise stack with the
                      cell padding and make the row unnecessarily tall. */}
                  <td className="px-4 py-1.5">
                    <Link
                      href={`/challenges/${e.challengeSlug}`}
                      className="inline-flex min-h-11 items-center font-medium text-ink hover:text-link"
                    >
                      {e.challengeTitle}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <DifficultyBadge difficulty={e.difficulty as never} />
                      <Badge variant="neutral">{e.category}</Badge>
                      {e.isCurrentUser && (
                        <span className="font-mono text-tiny text-link">
                          you
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-lg font-semibold tabular-nums text-ink">
                      {e.score}
                    </span>
                    <span className="font-mono text-tiny text-quiet">
                      {" "}
                      / 100
                    </span>
                    {e.passed && (
                      <Check
                        className="ml-1 inline size-3 text-signal"
                        aria-label="Passed"
                      />
                    )}
                    <div aria-hidden="true" className="mt-2 h-1.5 w-20 overflow-hidden rounded-full bg-[#e4eafb]">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, e.score))}%` }} />
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-quiet sm:table-cell">
                    <time dateTime={e.submittedAt.toISOString()}>
                      {formatRelative(e.submittedAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Link
          href="/challenges"
          className="inline-flex min-h-11 items-center text-mini text-link hover:underline"
        >
          Browse all challenges →
        </Link>
      </div>
    </div>
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
