"use client";

import { Check, Loader2, TerminalSquare, X } from "lucide-react";
import { useState } from "react";

import { Panel, PanelBody, PanelHeader, Tabs } from "@/components/ui/panel";
import { BlockGrid } from "@/packs/ssd/illustrations/block-grid";
import {
  EfficiencyDial,
  WearHistogram,
  WriteAmpBar,
} from "@/packs/ssd/illustrations/metrics";
import { SlotStrip } from "@/packs/ssd/illustrations/slot-strip";
import { cn } from "@/lib/utils";

import type { MetricDef, SubmissionResult, SubmissionState } from "./types";

export interface ConsolePanelProps {
  readonly state: SubmissionState;
  readonly result: SubmissionResult | null;
  readonly error: string | null;
  readonly metrics: readonly MetricDef[];
  readonly task: string;
  readonly className?: string;
}

type ConsoleTab = "result" | "console";

/**
 * The bottom half of the workspace: what your run scored, and what it printed.
 *
 * Results are drawn with the same illustrations the problem statement used, so
 * nothing here needs a second explanation — you already learned to read the
 * diagram while reading the problem.
 */
export function ConsolePanel({
  state,
  result,
  error,
  metrics,
  task,
  className,
}: ConsolePanelProps) {
  const [tab, setTab] = useState<ConsoleTab>("result");
  const consoleOutput = result?.console ?? "";

  return (
    <Panel className={cn("h-full", className)}>
      <PanelHeader className="justify-between">
        <Tabs
          label="Run output"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "result", label: "Result" },
            {
              id: "console",
              label: "Console",
              icon: <TerminalSquare className="size-3.5" aria-hidden />,
            },
          ]}
        />
        <StatusPill state={state} result={result} />
      </PanelHeader>

      <PanelBody className="px-4 py-4">
        {tab === "result" ? (
          <ResultView state={state} result={result} error={error} metrics={metrics} task={task} />
        ) : (
          <ConsoleView output={consoleOutput} state={state} />
        )}
      </PanelBody>
    </Panel>
  );
}

// ------------------------------------------------------------------ status

function StatusPill({
  state,
  result,
}: {
  state: SubmissionState;
  result: SubmissionResult | null;
}) {
  if (state === "submitting" || state === "queued" || state === "running") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-tint px-2 py-0.5 font-mono text-micro font-semibold text-link">
        <Loader2 className="size-3 motion-safe:animate-spin" aria-hidden />
        {state === "running" ? "Running" : state === "queued" ? "Queued" : "Submitting"}
      </span>
    );
  }

  if (state === "error") {
    return <span role="status" className="rounded-full bg-danger/10 px-2 py-0.5 font-mono text-micro font-semibold text-danger">Error</span>;
  }

  if (state === "done" && result) {
    const passed = result.status === "passed";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-micro font-semibold",
          passed ? "bg-signal/10 text-signal" : "bg-danger/10 text-danger",
        )}
        role="status"
      >
        {passed ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
        {passed ? "Passed" : "Failed"}
      </span>
    );
  }

  return null;
}

// ------------------------------------------------------------------ result

function ResultView({
  state,
  result,
  error,
  metrics,
  task,
}: {
  state: SubmissionState;
  result: SubmissionResult | null;
  error: string | null;
  metrics: readonly MetricDef[];
  task: string;
}) {
  if (state === "idle") {
    return (
      <div className="mx-auto flex h-full min-h-24 max-w-md flex-col justify-center gap-3">
        <div className="flex items-center gap-2 font-mono text-micro font-semibold tracking-[.07em] text-link uppercase">
          <span className="size-2 rounded-full bg-accent" aria-hidden="true" />
          Ready to run
        </div>
        <p className="text-mini text-body">Submit your solution to see how it behaves under the workload.</p>
        <div className="grid grid-cols-3 gap-1.5" aria-label="Run pipeline: compile, exercise, measure">
          {(["Compile", "Exercise", "Measure"] as const).map((stage, index) => (
            <div key={stage} className="rounded-6 border border-edge bg-tint px-2 py-2 text-center font-mono text-micro text-body">
              <span className="mr-1 text-link">0{index + 1}</span>{stage}
            </div>
          ))}
        </div>
        <p className="text-micro text-quiet">
          <kbd className="rounded-4 border border-edge bg-tint px-1.5 py-0.5 font-mono">⌘</kbd>
          {" + "}
          <kbd className="rounded-4 border border-edge bg-tint px-1.5 py-0.5 font-mono">↵</kbd>
          <span className="ml-2">also runs your code</span>
        </p>
      </div>
    );
  }

  if (state === "submitting" || state === "queued" || state === "running") {
    return (
      <div className="mx-auto flex h-full min-h-24 max-w-md flex-col justify-center gap-3" role="status">
        <div className="flex items-center gap-2 text-mini font-medium text-ink">
          <Loader2 className="size-4 text-accent motion-safe:animate-spin" aria-hidden />
          {state === "running" ? "Building and exercising your solution…" : state === "queued" ? "Waiting for a machine…" : "Sending your solution…"}
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {(["submitting", "queued", "running"] as const).map((stage, index) => (
            <div key={stage} className={cn("h-1.5 rounded-full transition-colors duration-200", ["submitting", "queued", "running"].indexOf(state) >= index ? "bg-accent" : "bg-edge")} />
          ))}
        </div>
        <p className="font-mono text-micro text-quiet">Submit / queue / execute</p>
      </div>
    );
  }

  if (state === "error" || !result) {
    return (
      <div className="rounded-8 border border-danger/30 bg-danger/[0.06] px-3.5 py-3">
        <p className="text-mini font-medium text-danger">The run did not complete</p>
        <p className="mt-1 whitespace-pre-wrap font-mono text-micro leading-relaxed text-body">
          {error ?? "No detail was reported."}
        </p>
      </div>
    );
  }

  const hasMeasurements = Object.keys(result.metrics).length > 0;
  return (
    <div className="space-y-5">
      <div className={cn("rounded-10 border px-3.5 py-3", result.status === "passed" ? "border-signal/25 bg-signal/[0.07]" : "border-danger/25 bg-danger/[0.06]")}>
        <p className={cn("flex items-center gap-2 font-mono text-mini font-bold", result.status === "passed" ? "text-signal" : "text-danger")}>
          {result.status === "passed" ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
          {result.status === "passed" ? "Workload passed" : !hasMeasurements ? "Run stopped before measurement" : "Workload needs another pass"}
        </p>
        <p className="mt-1 text-mini text-body">{result.status === "passed" ? "Your implementation met this run’s checks. Inspect the measurements below." : !hasMeasurements ? "Review the build or check output below, then try again." : "Inspect the feedback, revise your code, and run it again."}</p>
      </div>
      {result.message && result.status !== "passed" && (
        !hasMeasurements ? (
          <div className="rounded-8 border border-danger/25 bg-panel px-3.5 py-3">
            <p className="text-mini font-medium text-ink">
              {result.message.includes("TODO:")
                ? "The starter still has an unfinished TODO. Complete it, then run again."
                : "The build or check step returned diagnostic output."}
            </p>
            <details className="mt-2 text-mini text-body">
              <summary className="cursor-pointer font-mono text-micro font-semibold text-link underline-offset-4 hover:underline">View full diagnostic output</summary>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-6 bg-tint p-3 font-mono text-micro leading-relaxed text-body">{result.message}</pre>
            </details>
          </div>
        ) : (
          <div className="rounded-8 border border-danger/30 bg-danger/[0.06] px-3.5 py-3">
            <p className="whitespace-pre-wrap font-mono text-micro leading-relaxed text-body">{result.message}</p>
          </div>
        )
      )}

      <TaskVisuals task={task} result={result} />

      {task.startsWith("arena:") && (
        <p className="rounded-8 border border-accent/20 bg-accent-tint px-3 py-2 text-mini text-body">
          {hasMeasurements
            ? "Practice run. Use the verdict and measurements to improve your solution; this challenge is not ranked yet."
            : "Practice run. Measurements appear after the checks complete; this challenge is not ranked yet."}
        </p>
      )}

      {metrics.length > 0 && <MetricTable metrics={metrics} values={result.metrics} />}

      {result.adversarial && <AdversarialList adversarial={result.adversarial} />}
    </div>
  );
}

/**
 * Draws the run with the illustrations belonging to whichever rung produced it.
 *
 * Which visuals apply is a property of the task, so this switches on the task
 * name rather than sniffing the payload for fields that happen to be present.
 */
function TaskVisuals({ task, result }: { task: string; result: SubmissionResult }) {
  const detail = result.detail;

  if (task === "compaction") {
    const moves = detail?.moves;
    const optimal = detail?.optimal;

    return (
      <div className="space-y-4">
        {moves !== undefined && optimal !== undefined && (
          <EfficiencyDial moves={moves} optimal={optimal} />
        )}
        {detail?.initial_slots && (
          <LabelledFigure label="Before">
            <SlotStrip slots={detail.initial_slots} prefix={detail.live_values} />
          </LabelledFigure>
        )}
        {detail?.final_slots && (
          <LabelledFigure label="After your moves">
            <SlotStrip slots={detail.final_slots} prefix={detail.live_values} />
          </LabelledFigure>
        )}
      </div>
    );
  }

  const blocks = detail?.final_state ?? result.finalState;
  const hostWrites = result.metrics.host_writes;
  const gcWrites = result.metrics.gc_writes;

  return (
    <div className="space-y-4">
      {hostWrites !== undefined && gcWrites !== undefined && (
        <WriteAmpBar hostWrites={hostWrites} gcWrites={gcWrites} />
      )}
      {blocks && blocks.length > 0 && (
        <>
          {task === "wear-leveling" && (
            <WearHistogram eraseCounts={blocks.map((block) => block.eraseCount)} />
          )}
          <LabelledFigure label="Device at the end of the run">
            <BlockGrid
              blocks={blocks}
              pagesPerBlock={blocks[0].valid + blocks[0].invalid + blocks[0].free}
            />
          </LabelledFigure>
        </>
      )}
    </div>
  );
}

function LabelledFigure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-micro uppercase tracking-wide text-quiet">{label}</span>
      {children}
    </div>
  );
}

function MetricTable({
  metrics,
  values,
}: {
  metrics: readonly MetricDef[];
  values: Readonly<Record<string, number>>;
}) {
  const present = metrics.filter((metric) => values[metric.key] !== undefined);
  if (present.length === 0) return null;

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {present.map((metric) => (
        <div key={metric.key} className="border-t border-edge pt-2">
          <dt className="text-micro text-quiet" title={metric.description}>
            {metric.label}
          </dt>
          <dd className="font-mono text-mini tabular-nums text-ink">
            {formatMetric(values[metric.key])}
            {metric.unit && <span className="ml-0.5 text-quiet">{metric.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AdversarialList({
  adversarial,
}: {
  adversarial: NonNullable<SubmissionResult["adversarial"]>;
}) {
  return (
    <div className="space-y-2">
      <span className="text-micro font-medium uppercase tracking-wide text-muted">
        Fault injection
      </span>
      <ul className="space-y-1.5">
        {adversarial.scenarios.map((scenario) => (
          <li key={scenario.name} className="flex items-start gap-2 text-mini">
            {scenario.passed ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden />
            ) : (
              <X className="mt-0.5 size-3.5 shrink-0 text-danger" aria-hidden />
            )}
            <span className="min-w-0">
              <span className="font-mono text-micro text-body">{scenario.name}</span>
              {scenario.error && (
                <span className="ml-2 text-micro text-quiet">{scenario.error}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------- console

function ConsoleView({ output, state }: { output: string; state: SubmissionState }) {
  if (!output) {
    return (
      <p className="text-mini text-quiet">
        {state === "idle"
          ? "Anything your solution prints will show up here."
          : "Your solution printed nothing."}
      </p>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-micro leading-relaxed text-body">
      {output}
    </pre>
  );
}

function formatMetric(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}
