"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertCircle, Loader2, BarChart3 } from "lucide-react";
import type { MetricDef, ScoringDef, SubmissionResult } from "./arena";
import { SsdBlockGrid, type BlockState } from "./ssd-block-grid";

export interface ResultsPanelProps {
  state: "idle" | "submitting" | "queued" | "running" | "done" | "error";
  result: SubmissionResult | null;
  error: string | null;
  metrics: MetricDef[];
  scoring: ScoringDef;
  submissionId: string | null;
}

export function ResultsPanel({
  state,
  result,
  error,
  metrics,
  scoring,
  submissionId,
}: ResultsPanelProps) {
  if (state === "idle") {
    return (
      <div className="rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-center gap-2 text-ink-muted">
          <BarChart3 className="h-4 w-4" />
          <span className="font-mono text-xs">
            Submit your solution to see results.
          </span>
        </div>
      </div>
    );
  }

  if (state === "submitting" || state === "queued" || state === "running") {
    return (
      <div className="rounded-lg border border-edge bg-surface p-5">
        <div className="flex items-center gap-2 text-ink-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-xs">
            {state === "submitting" && "Submitting…"}
            {state === "queued" && "Queued — waiting for a runner…"}
            {state === "running" && "Running your solution against the workload…"}
          </span>
        </div>
        {submissionId && (
          <p className="mt-2 font-mono text-[10px] text-ink-muted">
            submission: {submissionId}
          </p>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-5">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-sm font-medium text-danger">Submission failed</p>
            <p className="mt-1 text-xs text-ink-secondary">
              {error ?? "An unknown error occurred."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // state === "done"
  if (!result) return null;

  const passed = result.status === "passed";
  const score = result.score;

  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        passed
          ? "border-signal/30 bg-signal/5"
          : "border-warning/30 bg-warning/5",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {passed ? (
            <CheckCircle2 className="h-5 w-5 text-signal" />
          ) : (
            <XCircle className="h-5 w-5 text-warning" />
          )}
          <span className="text-sm font-medium text-ink">
            {passed ? "Passed" : "Did not pass"}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-2xl font-semibold text-ink">
            {score}
          </span>
          <span className="font-mono text-xs text-ink-muted">/ 100</span>
        </div>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {passed
          ? `Score above ${scoring.passThreshold} to pass. You beat the ${scoring.referenceSolution} reference by ${Math.max(0, score - 100)} points.`
          : `Score ${score} is below the pass threshold of ${scoring.passThreshold}.`}
      </p>

      <div className="mt-4 space-y-2">
        {metrics.map((m) => {
          const value = result.metrics[m.key];
          return (
            <div
              key={m.key}
              className="flex items-center justify-between border-b border-edge/50 pb-2 last:border-0"
            >
              <div>
                <p className="text-xs font-medium text-ink">{m.label}</p>
                <p className="text-[10px] text-ink-muted">{m.description}</p>
              </div>
              <span className="font-mono text-sm text-ink-secondary">
                {value !== undefined ? formatMetric(value, m.unit) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {result.finalState && result.finalState.length > 0 && (
        <div className="mt-5 border-t border-edge pt-4">
          <SsdBlockGrid
            blocks={result.finalState as BlockState[]}
            pagesPerBlock={Math.max(
              ...result.finalState.map(
                (b) => b.valid + b.invalid + b.free,
              ),
            )}
          />
        </div>
      )}

      {result.message && (
        <p className="mt-3 text-xs text-ink-muted">{result.message}</p>
      )}
    </div>
  );
}

function formatMetric(value: number, unit: string): string {
  if (unit === "ratio") return value.toFixed(2);
  if (unit === "stddev") return value.toFixed(2);
  return value.toLocaleString();
}
