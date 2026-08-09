import { describe, it, expect } from "vitest";
import { checkRateLimit, msUntilReset } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows up to maxPerWindow requests", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("test-allow", 5)).toBe(true);
    }
    // The 6th should be blocked.
    expect(checkRateLimit("test-allow", 5)).toBe(false);
  });

  it("blocks further requests after the quota is exhausted", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test-block", 3);
    }
    expect(checkRateLimit("test-block", 3)).toBe(false);
    expect(checkRateLimit("test-block", 3)).toBe(false);
  });

  it("tracks identities independently", () => {
    for (let i = 0; i < 2; i++) {
      checkRateLimit("user-a", 2);
    }
    // user-a is exhausted, user-b is untouched.
    expect(checkRateLimit("user-a", 2)).toBe(false);
    expect(checkRateLimit("user-b", 2)).toBe(true);
    expect(checkRateLimit("user-b", 2)).toBe(true);
    expect(checkRateLimit("user-b", 2)).toBe(false);
  });
});

describe("msUntilReset", () => {
  it("returns 0 for an empty bucket", () => {
    expect(msUntilReset("never-used")).toBe(0);
  });

  it("returns a positive value for a partially-filled bucket", () => {
    checkRateLimit("partial", 10);
    const ms = msUntilReset("partial");
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(60_000);
  });
});
