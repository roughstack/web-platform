/** Shared shapes between the arena panels and the submission API. */

export type SubmissionState =
  | "idle"
  | "submitting"
  | "queued"
  | "running"
  | "done"
  | "error";

export interface MetricDef {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
  readonly description: string;
  readonly lowerIsBetter: boolean;
  readonly weight: number;
}

export interface ScenarioResult {
  readonly name: string;
  readonly passed: boolean;
  readonly error?: string;
  readonly metrics?: Readonly<Record<string, number>>;
}

export interface AdversarialResult {
  readonly passed: boolean;
  readonly scenarios: readonly ScenarioResult[];
}

export interface BlockState {
  readonly index: number;
  readonly valid: number;
  readonly invalid: number;
  readonly free: number;
  readonly eraseCount: number;
  readonly isOverProvision: boolean;
}

/** What the compaction rung reports back, for the SlotStrip to draw. */
export interface CompactionDetail {
  readonly initial_slots?: readonly number[];
  readonly final_slots?: readonly number[];
  readonly moves?: number;
  readonly optimal?: number;
  readonly efficiency?: number;
  readonly live_values?: number;
}

/** What the device rungs report back, for the BlockGrid to draw. */
export interface DeviceDetail {
  readonly final_state?: readonly BlockState[];
  readonly adversarial?: AdversarialResult;
}

export interface SubmissionResult {
  readonly status: "passed" | "failed" | "error";
  readonly score: number;
  readonly metrics: Readonly<Record<string, number>>;
  readonly message?: string;
  /** Everything the solution wrote to stderr. Never influences the score. */
  readonly console?: string;
  /** Task-specific payload. Shape depends on which rung ran. */
  readonly detail?: CompactionDetail & DeviceDetail;
  readonly adversarial?: AdversarialResult;
  readonly finalState?: readonly BlockState[];
}
