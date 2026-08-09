/**
 * Simple in-memory sliding-window rate limiter for submission throttling
 * (anti-AI Layer 3c). Prevents the "generate, submit, fail, regenerate"
 * loop by capping submissions per minute per identity.
 *
 * In production this should be backed by Redis or a similar shared store so
 * it works across multiple server instances. For the MVP, in-memory is fine
 * because there is a single server process.
 */

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

/** Window size in ms. */
const WINDOW_MS = 60_000;

/**
 * checkRateLimit returns true if the identity is within the allowed quota
 * for the current window, and records the attempt. Returns false if the
 * quota is exhausted.
 */
export function checkRateLimit(
  identity: string,
  maxPerWindow: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(identity) ?? { timestamps: [] };

  // Drop timestamps outside the window.
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < WINDOW_MS);

  if (bucket.timestamps.length >= maxPerWindow) {
    buckets.set(identity, bucket);
    return false;
  }

  bucket.timestamps.push(now);
  buckets.set(identity, bucket);
  return true;
}

/** msUntilReset returns how long until the oldest entry in the window expires,
 *  i.e. how long the caller should wait before retrying. Returns 0 if the
 *  bucket is empty or has capacity. */
export function msUntilReset(identity: string): number {
  const bucket = buckets.get(identity);
  if (!bucket || bucket.timestamps.length === 0) return 0;
  const oldest = bucket.timestamps[0];
  return Math.max(0, WINDOW_MS - (Date.now() - oldest));
}
