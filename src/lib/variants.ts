import { cookies } from "next/headers";

/**
 * Per-user workload variants (anti-AI Layer 1a).
 *
 * Every visitor gets a stable per-session seed derived from a cookie. The
 * seed drives the workload RNG and slightly varies the device geometry
 * (block count, page count, hot-set fraction) within a bounded range. This
 * means an AI-generated solution tuned to one user's variant will not
 * transfer to another user's variant — the workload, geometry, and hot/cold
 * split are all different.
 *
 * For logged-in users (once auth is wired), the seed should be derived from
 * the user ID instead, so it persists across sessions. For now, anonymous
 * sessions use a cookie that lasts 30 days.
 */
const SESSION_COOKIE = "ba-variant";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface WorkloadVariant {
  seed: number;
  blocks: number;
  pagesPerBlock: number;
  logicalPages: number;
  hotFraction: number;
  hotProbability: number;
}

/**
 * getWorkloadVariant reads (or creates) the per-session variant cookie and
 * returns the derived workload parameters. The parameters are deterministic
 * per session, so the same user always sees the same variant.
 */
export async function getWorkloadVariant(): Promise<WorkloadVariant> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;

  let sessionSeed: number;
  if (existing) {
    sessionSeed = hashStringToInt(existing);
  } else {
    // Generate a fresh session token. crypto.randomUUID is available in
    // Next.js server runtime.
    const token = crypto.randomUUID();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    sessionSeed = hashStringToInt(token);
  }

  return deriveVariant(sessionSeed);
}

/**
 * deriveVariant maps a session seed to concrete workload parameters. The
 * ranges are deliberately narrow so the challenge stays fair (same
 * difficulty) but the exact inputs differ (no transferability).
 */
export function deriveVariant(seed: number): WorkloadVariant {
  // Use a simple LCG to derive sub-seeds for each parameter so they vary
  // independently within their ranges.
  const rng = makeLCG(seed);

  // Blocks: 14-18 (centered on 16)
  const blocks = 14 + (rng() % 5);
  // Pages per block: 48-80 (centered on 64, multiple of 16 for alignment)
  const pagesPerBlock = 48 + (rng() % 5) * 16;
  // Logical pages: roughly 0.75x addressable capacity, ±10%
  const addressable = blocks * pagesPerBlock;
  const logicalPages = Math.round(addressable * (0.7 + (rng() % 20) / 100));
  // Hot fraction: 0.15-0.25
  const hotFraction = 0.15 + (rng() % 100) / 1000;
  // Hot probability: 0.75-0.85
  const hotProbability = 0.75 + (rng() % 100) / 1000;

  return {
    seed,
    blocks,
    pagesPerBlock,
    logicalPages,
    hotFraction,
    hotProbability,
  };
}

/**
 * hashStringToInt folds a string into a 32-bit integer using FNV-1a. Good
 * enough for session seeding — we don't need cryptographic strength, just
 * uniform distribution and determinism.
 */
export function hashStringToInt(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
  h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * makeLCG returns a closure that produces pseudo-random 32-bit integers
 * using a linear congruential generator. Seeded deterministically so the
 * same session seed always produces the same parameter set.
 */
function makeLCG(seed: number): () => number {
  let state = seed || 1;
  return () => {
    // Numerical Recipes LCG constants for 32-bit.
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}
