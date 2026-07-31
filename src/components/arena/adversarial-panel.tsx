"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ShieldCheck, ShieldAlert } from "lucide-react";
import type { AdversarialResult, ScenarioResult } from "./arena";

const SCENARIO_LABELS: Record<string, string> = {
  hot_page_thrash: "Hot-page thrash",
  capacity_pressure: "Capacity pressure",
  power_loss_recovery: "Power-loss recovery",
};

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  hot_page_thrash:
    "A single page is rewritten thousands of times. Migrating it on every reclaim destroys write amplification.",
  capacity_pressure:
    "The device is filled to its limit with minimal over-provisioning. Wasteful policies stall.",
  power_loss_recovery:
    "Reclaim is interrupted mid-migration. The device must remain consistent on recovery.",
};

export interface AdversarialPanelProps {
  adversarial: AdversarialResult | null;
}

export function AdversarialPanel({ adversarial }: AdversarialPanelProps) {
  if (!adversarial) return null;

  const allPassed = adversarial.passed;

  return (
    <div
      className={cn(
        "mt-5 rounded-lg border p-4",
        allPassed
          ? "border-signal/20 bg-signal/5"
          : "border-danger/30 bg-danger/5",
      )}
    >
      <div className="flex items-center gap-2">
        {allPassed ? (
          <ShieldCheck className="h-4 w-4 text-signal" />
        ) : (
          <ShieldAlert className="h-4 w-4 text-danger" />
        )}
        <h4 className="text-xs font-medium text-ink">
          Adversarial fault injection
        </h4>
        <span
          className={cn(
            "ml-auto font-mono text-[10px]",
            allPassed ? "text-signal" : "text-danger",
          )}
        >
          {adversarial.scenarios.filter((s) => s.passed).length}/
          {adversarial.scenarios.length} survived
        </span>
      </div>

      <p className="mt-1 text-[10px] text-ink-muted">
        Your policy was re-run under three fault-injection scenarios after the
        standard workload. A solution that scores well but corrupts data under
        any scenario fails overall.
      </p>

      <div className="mt-3 space-y-2">
        {adversarial.scenarios.map((s) => (
          <ScenarioRow key={s.name} scenario={s} />
        ))}
      </div>
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: ScenarioResult }) {
  const label = SCENARIO_LABELS[scenario.name] ?? scenario.name;
  const description = SCENARIO_DESCRIPTIONS[scenario.name] ?? "";

  return (
    <div className="flex items-start gap-2 border-b border-edge/50 pb-2 last:border-0">
      {scenario.passed ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink">{label}</p>
        {description && (
          <p className="text-[10px] text-ink-muted">{description}</p>
        )}
        {scenario.error && (
          <p className="mt-0.5 font-mono text-[10px] text-danger">
            {scenario.error}
          </p>
        )}
        {scenario.metrics && scenario.passed && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-ink-muted">
            {Object.entries(scenario.metrics).map(([k, v]) => (
              <span key={k}>
                {k}: <span className="text-ink-secondary">{v}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
