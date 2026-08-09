import { describe, expect, it } from "vitest";
import {
  computeScore,
  scoredMetricsFrom,
  REFERENCE_SCORE,
  type ScoredMetric,
} from "@/lib/scoring";

const lowerBetter = (key: string, weight = 1): ScoredMetric => ({
  key,
  lowerIsBetter: true,
  weight,
});

describe("computeScore", () => {
  it("awards the reference score for matching the reference", () => {
    const score = computeScore(
      { write_amplification: 1.4 },
      { write_amplification: 1.4 },
      [lowerBetter("write_amplification")],
    );

    expect(score).toBe(REFERENCE_SCORE);
  });

  it("scores above the reference for beating it", () => {
    const score = computeScore(
      { write_amplification: 1.12 },
      { write_amplification: 1.4 },
      [lowerBetter("write_amplification")],
    );

    expect(score).toBe(125);
  });

  it("scores below the reference for losing to it", () => {
    const score = computeScore(
      { write_amplification: 2.8 },
      { write_amplification: 1.4 },
      [lowerBetter("write_amplification")],
    );

    expect(score).toBe(50);
  });

  it("reads higher-is-better metrics the other way round", () => {
    const score = computeScore({ throughput: 200 }, { throughput: 100 }, [
      { key: "throughput", lowerIsBetter: false, weight: 1 },
    ]);

    expect(score).toBe(200);
  });

  it("weights metrics by their declared importance", () => {
    // One metric matches the reference, the other doubles it. With equal
    // weights that averages to 0.75; the heavier weight on the good metric
    // should pull the result up.
    const balanced = computeScore(
      { a: 1, b: 2 },
      { a: 1, b: 1 },
      [lowerBetter("a"), lowerBetter("b")],
    );
    const tilted = computeScore(
      { a: 1, b: 2 },
      { a: 1, b: 1 },
      [lowerBetter("a", 3), lowerBetter("b", 1)],
    );

    expect(balanced).toBe(75);
    expect(tilted).toBeGreaterThan(balanced);
  });

  it("ignores metrics declared with no weight", () => {
    // "optimal" describes the instance rather than the attempt, so a run that
    // matched it exactly should score the same as if it were absent.
    const score = computeScore({ moves: 12, optimal: 11 }, { moves: 12 }, [
      lowerBetter("moves"),
      lowerBetter("optimal", 0),
    ]);

    expect(score).toBe(REFERENCE_SCORE);
  });

  it("caps how far one metric can carry the score", () => {
    // A near-zero wear spread is a real possibility on a light workload, and
    // without a cap it would swamp every other term.
    const score = computeScore(
      { wear_spread: 0.0001 },
      { wear_spread: 3 },
      [lowerBetter("wear_spread")],
    );

    expect(score).toBe(200);
  });

  it("returns zero when the sprite reported no reference to compare against", () => {
    const score = computeScore({ write_amplification: 1.2 }, {}, [
      lowerBetter("write_amplification"),
    ]);

    expect(score).toBe(0);
  });

  it("skips metrics the task did not report", () => {
    const score = computeScore(
      { write_amplification: 1.4 },
      { write_amplification: 1.4, wear_spread: 2 },
      [lowerBetter("write_amplification"), lowerBetter("wear_spread")],
    );

    expect(score).toBe(REFERENCE_SCORE);
  });

  it("ignores metrics that came back as NaN or Infinity", () => {
    const score = computeScore(
      { write_amplification: Number.POSITIVE_INFINITY, gc_writes: 100 },
      { write_amplification: 1.4, gc_writes: 100 },
      [lowerBetter("write_amplification"), lowerBetter("gc_writes")],
    );

    expect(score).toBe(REFERENCE_SCORE);
  });
});

describe("scoredMetricsFrom", () => {
  it("reads the wrapped shape challenges are actually seeded with", () => {
    const config = scoredMetricsFrom({
      metrics: [
        { key: "moves", label: "Moves used", lowerIsBetter: true, weight: 1 },
        { key: "optimal", label: "Fewest possible", weight: 0 },
      ],
    });

    expect(config).toEqual([
      { key: "moves", lowerIsBetter: true, weight: 1 },
      { key: "optimal", lowerIsBetter: true, weight: 0 },
    ]);
  });

  it("also accepts a bare array", () => {
    expect(scoredMetricsFrom([{ key: "moves", weight: 1 }])).toEqual([
      { key: "moves", lowerIsBetter: true, weight: 1 },
    ]);
  });

  it("defaults weight to one, so a new metric counts rather than vanishes", () => {
    expect(scoredMetricsFrom([{ key: "latency" }])).toEqual([
      { key: "latency", lowerIsBetter: true, weight: 1 },
    ]);
  });

  it("survives malformed stored config", () => {
    expect(scoredMetricsFrom(null)).toEqual([]);
    expect(scoredMetricsFrom("not an array")).toEqual([]);
    expect(scoredMetricsFrom([null, 42, { noKey: true }])).toEqual([]);
  });
});
