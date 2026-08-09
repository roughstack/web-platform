/**
 * Scoring turns a task's raw measurements into one comparable number.
 *
 * The rule is deliberately boring: each metric is compared to the reference
 * solution's result on the same instance, and the ratios are averaged by
 * weight. 100 means you matched the reference. Above 100 means you beat it.
 *
 * Two things stay out of here on purpose. The execution backend does not score,
 * because it runs whatever task it is handed and has no idea whether a low
 * number is good. The challenge's seed data does not carry baseline values,
 * because the sprite measures them per run — every session gets a slightly
 * different device, and a constant would rank luck rather than skill. The
 * challenge contributes only what it genuinely knows: which metrics matter,
 * which direction is better, and how much each one counts.
 */

/** One measurement a challenge cares about, as declared in its seed data. */
export interface ScoredMetric {
  key: string;
  /** True when a smaller number is a better result, e.g. write amplification. */
  lowerIsBetter: boolean;
  /**
   * Relative importance. Weights need not sum to anything in particular.
   * A weight of 0 reports the metric without letting it move the score, which
   * is how context numbers like "fewest possible" are declared.
   */
  weight: number;
}

/**
 * A single metric can carry the score no further than this multiple of the
 * baseline. Without a cap, a metric that happens to land near zero — a wear
 * spread of 0.001, say — would swamp every other term and make the leaderboard
 * a contest in finding degenerate workloads.
 */
const MAX_RATIO = 2;

/** The neutral score, awarded for exactly matching the reference solution. */
export const REFERENCE_SCORE = 100;

export function computeScore(
  metrics: Record<string, number>,
  baseline: Record<string, number>,
  config: ScoredMetric[],
): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const metric of config) {
    if (metric.weight <= 0) continue;

    const value = metrics[metric.key];
    const reference = baseline[metric.key];
    if (!Number.isFinite(value) || !Number.isFinite(reference)) continue;

    const ratio = metric.lowerIsBetter
      ? reference / Math.max(value, 1e-6)
      : value / Math.max(reference, 1e-6);

    weighted += metric.weight * Math.min(MAX_RATIO, ratio);
    totalWeight += metric.weight;
  }

  // No comparable metric came back, which means the sprite could not measure a
  // reference. Reporting the run as unscored is honest; inventing a number is
  // not.
  if (totalWeight === 0) return 0;

  return Math.round((weighted / totalWeight) * REFERENCE_SCORE);
}

/**
 * Narrows the challenge's stored JSON metric config to what scoring needs.
 *
 * The stored value is `{ metrics: [...] }` — a wrapper, so the column has room
 * for scoring settings that are not per-metric. A bare array is accepted too,
 * because it is the obvious thing to write by hand and silently scoring
 * nothing is a bad way to find out you guessed wrong.
 */
export function scoredMetricsFrom(raw: unknown): ScoredMetric[] {
  const entries = Array.isArray(raw)
    ? raw
    : ((raw as { metrics?: unknown } | null)?.metrics ?? null);

  if (!Array.isArray(entries)) return [];

  return entries.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const m = entry as Record<string, unknown>;
    if (typeof m.key !== "string") return [];

    return [
      {
        key: m.key,
        lowerIsBetter: m.lowerIsBetter !== false,
        weight: typeof m.weight === "number" ? m.weight : 1,
      },
    ];
  });
}
