import { describe, it, expect } from "vitest";
import { deriveVariant, hashStringToInt } from "@/lib/variants";

// We test the pure derivation functions directly. The cookie-backed
// getWorkloadVariant is exercised by the E2E submission test.

describe("hashStringToInt", () => {
  it("is deterministic for the same input", () => {
    expect(hashStringToInt("abc")).toBe(hashStringToInt("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashStringToInt("abc")).not.toBe(hashStringToInt("abd"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const h = hashStringToInt("test-string");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
    expect(Number.isInteger(h)).toBe(true);
  });
});

describe("deriveVariant", () => {
  it("is deterministic for the same seed", () => {
    const a = deriveVariant(42);
    const b = deriveVariant(42);
    expect(a).toEqual(b);
  });

  it("produces different parameters for different seeds", () => {
    const a = deriveVariant(42);
    const b = deriveVariant(999);
    expect(a).not.toEqual(b);
  });

  it("keeps blocks in the 14-18 range", () => {
    for (let i = 0; i < 50; i++) {
      const v = deriveVariant(i * 1000 + 7);
      expect(v.blocks).toBeGreaterThanOrEqual(14);
      expect(v.blocks).toBeLessThanOrEqual(18);
    }
  });

  it("keeps pagesPerBlock in the 48-112 range and a multiple of 16", () => {
    for (let i = 0; i < 50; i++) {
      const v = deriveVariant(i * 1000 + 13);
      expect(v.pagesPerBlock).toBeGreaterThanOrEqual(48);
      expect(v.pagesPerBlock).toBeLessThanOrEqual(112);
      expect(v.pagesPerBlock % 16).toBe(0);
    }
  });

  it("keeps hotFraction in the 0.15-0.25 range", () => {
    for (let i = 0; i < 50; i++) {
      const v = deriveVariant(i * 1000 + 17);
      expect(v.hotFraction).toBeGreaterThanOrEqual(0.15);
      expect(v.hotFraction).toBeLessThanOrEqual(0.25);
    }
  });

  it("keeps hotProbability in the 0.75-0.85 range", () => {
    for (let i = 0; i < 50; i++) {
      const v = deriveVariant(i * 1000 + 23);
      expect(v.hotProbability).toBeGreaterThanOrEqual(0.75);
      expect(v.hotProbability).toBeLessThanOrEqual(0.85);
    }
  });

  it("produces varied parameters across many seeds", () => {
    const blocks = new Set<number>();
    const pages = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const v = deriveVariant(i * 7919 + 1);
      blocks.add(v.blocks);
      pages.add(v.pagesPerBlock);
    }
    // We should see at least 3 distinct block counts and 3 distinct page
    // counts across 100 seeds — otherwise the variant isn't actually
    // varying.
    expect(blocks.size).toBeGreaterThanOrEqual(3);
    expect(pages.size).toBeGreaterThanOrEqual(3);
  });
});
