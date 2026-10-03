import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface ExecutionRequest {
  code: string;
  language: string;
  /** Which registered sprite task grades this run, e.g. "victim-selection". */
  task: string;
  seed: number;
  timeoutSec: number;

  /** Device geometry. Ignored by tasks that do not model a device. */
  operations?: number;
  blocks?: number;
  pagesPerBlock?: number;
  overProvisionBlocks?: number;
  logicalPages?: number;
  hotFraction?: number;
  hotProbability?: number;

  /** Flat-array geometry, for the compaction task. */
  slots?: number;
  liveFraction?: number;
}

export interface ExecutionResult {
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  /** The reference solution's numbers on the same instance. */
  baseline: Record<string, number>;
  executionTimeMs: number;
  error?: string;
  buildErrors?: string;
  /** Everything the solution printed. Shown verbatim; never scored. */
  console?: string;
  /** Task-specific payload the arena's illustrations draw from. */
  detail?: unknown;
  finalState?: BlockState[];
  adversarial?: AdversarialResult;
}

export interface AdversarialResult {
  passed: boolean;
  scenarios: ScenarioResult[];
}

export interface ScenarioResult {
  name: string;
  passed: boolean;
  error?: string;
  metrics?: Record<string, number>;
}

export interface BlockState {
  index: number;
  valid: number;
  invalid: number;
  free: number;
  eraseCount: number;
  isOverProvision: boolean;
}

export interface ExecutionBackend {
  execute(req: ExecutionRequest): Promise<ExecutionResult>;
}

/** The JSON the sprite runner and entrypoint both emit. */
interface RunnerReport {
  task?: string;
  solution_name?: string;
  passed?: boolean;
  error?: string;
  metrics?: Record<string, number>;
  baseline?: Record<string, number>;
  detail?: {
    final_state?: BlockState[];
    adversarial?: AdversarialResult;
    [key: string]: unknown;
  };
  console?: string;
  execution_time_ms?: number;
  timed_out?: boolean;
  /** Only present when the submission failed to compile. */
  build_output?: string;
}

/** Emits a flag only when the caller supplied a value for it. */
function optionalFlag(flag: string, value: number | undefined): string[] {
  return value === undefined ? [] : [flag, String(value)];
}

/**
 * LocalDockerBackend runs user code in a local Docker container using the
 * Sprite image. This is the development execution mode; production uses
 * FlyMachinesBackend (not yet implemented).
 *
 * The container receives user code on stdin and runner flags as arguments.
 * It compiles the code, runs the harness, and emits JSON on stdout. We parse
 * that JSON and return it as the ExecutionResult.
 */
export class LocalDockerBackend implements ExecutionBackend {
  private image: string;
  private networkDisabled: boolean;

  constructor(opts: { image: string; networkDisabled?: boolean }) {
    this.image = opts.image;
    this.networkDisabled = opts.networkDisabled ?? true;
  }

  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    const args = [
      "run",
      "--rm",
      "-i",
      "--memory=512m",
      "--cpus=1",
      `--name=sprite-${randomUUID()}`,
    ];

    if (this.networkDisabled) {
      args.push("--network=none");
    }

    args.push(this.image);
    args.push(
      "--language",
      req.language,
      "--task",
      req.task,
      "--seed",
      String(req.seed),
      "--timeout",
      String(req.timeoutSec),
      // Every task fills in its own defaults, so a parameter left unset here
      // means "whatever this task considers normal" rather than zero.
      ...optionalFlag("--operations", req.operations),
      ...optionalFlag("--blocks", req.blocks),
      ...optionalFlag("--pages-per-block", req.pagesPerBlock),
      ...optionalFlag("--op-blocks", req.overProvisionBlocks),
      ...optionalFlag("--logical-pages", req.logicalPages),
      ...optionalFlag("--hot-fraction", req.hotFraction),
      ...optionalFlag("--hot-probability", req.hotProbability),
      ...optionalFlag("--slots", req.slots),
      ...optionalFlag("--live-fraction", req.liveFraction),
    );

    return new Promise<ExecutionResult>((resolve) => {
      const child = spawn("docker", args, {
        timeout: (req.timeoutSec + 10) * 1000,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      child.on("error", (err) => {
        resolve({
          passed: false,
          score: 0,
          metrics: {},
          baseline: {},
          executionTimeMs: 0,
          error: `Failed to spawn docker: ${err.message}`,
        });
      });

      child.on("close", (code) => {
        // Parsed regardless of exit code: the entrypoint emits the same JSON
        // shape for a build failure as the runner does for a finished run, so
        // there is exactly one thing to handle here.
        try {
          const raw = JSON.parse(stdout) as RunnerReport;
          const metrics = raw.metrics ?? {};

          resolve({
            passed: raw.passed ?? false,
            // The backend does not know which metrics are good. The caller
            // scores the run against the challenge's own config.
            score: 0,
            // Passed through whole. The frontend decides which metrics to show
            // from the challenge's own config, so a new task surfacing a new
            // measurement needs no change here.
            metrics,
            baseline: raw.baseline ?? {},
            executionTimeMs: raw.execution_time_ms ?? 0,
            error: raw.error,
            buildErrors: raw.build_output,
            console: raw.console,
            detail: raw.detail,
            finalState: raw.detail?.final_state ?? [],
            adversarial: raw.detail?.adversarial,
          });
          return;
        } catch {
          // stdout was not JSON, which means the container died before the
          // entrypoint could report anything. Fall through.
        }

        if (timedOut) {
          resolve({
            passed: false,
            score: 0,
            metrics: {},
            baseline: {},
            executionTimeMs: (req.timeoutSec + 10) * 1000,
            error: "Execution timed out",
          });
          return;
        }

        resolve({
          passed: false,
          score: 0,
          metrics: {},
          baseline: {},
          executionTimeMs: 0,
          error: stderr || `docker exited with code ${code}`,
        });
      });

      // Handle the timeout event from spawn. Node emits 'timeout' before
      // 'exit' and 'close' when the spawn timeout fires, so setting the flag
      // here guarantees the close handler sees it. The previous version
      // inferred timeout from child.killed inside the exit handler, which is
      // fragile: child.killed is true for any kill (including a manual one)
      // and the exit/close ordering of that flag was not guaranteed. Listening
      // to the dedicated event is the documented contract.
      child.on("timeout", () => {
        timedOut = true;
        child.kill();
      });

      // Write user code to stdin and close it.
      child.stdin.write(req.code);
      child.stdin.end();
    });
  }
}

/**
 * StubBackend is the fallback when no execution backend is configured. It
 * returns a synthetic result so the UI flow works without Docker running.
 *
 * The numbers are shaped per task rather than fixed, because a stub that
 * always returns write amplification would make the compaction challenge look
 * broken during development.
 */
export class StubBackend implements ExecutionBackend {
  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    await new Promise((r) => setTimeout(r, 1200));

    const metrics: Record<string, number> =
      req.task === "compaction"
        ? { moves: 12, optimal: 11, extra_moves: 1 }
        : {
            write_amplification: 1.35,
            total_erases: 190,
            wear_spread: 2.8,
            gc_writes: 380,
          };

    return {
      passed: true,
      score: 0,
      metrics,
      // The stub has no reference run, so nothing is comparable and the score
      // stays 0. That is the intended tell that Docker is not wired up.
      baseline: {},
      executionTimeMs: 1200,
      console: "(stub backend: set EXECUTION_MODE=local to run for real)",
    };
  }
}

/**
 * getExecutionBackend returns the configured backend based on environment.
 * - EXECUTION_MODE=local → LocalDockerBackend (requires execution runtime image)
 * - EXECUTION_MODE=stub  → StubBackend (synthetic, for development)
 * - unset                → StubBackend
 */
let cachedBackend: ExecutionBackend | null = null;

export function getExecutionBackend(): ExecutionBackend {
  if (cachedBackend) return cachedBackend;

  const mode = process.env.EXECUTION_MODE ?? "stub";
  const image =
    process.env.EXECUTION_RUNTIME_IMAGE ??
    process.env.SPRITE_IMAGE ??
    "roughstack-execution-runtime:latest";

  if (mode === "local") {
    cachedBackend = new LocalDockerBackend({ image });
  } else {
    cachedBackend = new StubBackend();
  }

  return cachedBackend;
}
