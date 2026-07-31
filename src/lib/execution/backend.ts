import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

export interface ExecutionRequest {
  code: string;
  language: string;
  seed: number;
  operations: number;
  blocks: number;
  pagesPerBlock: number;
  overProvisionBlocks: number;
  logicalPages: number;
  hotFraction: number;
  hotProbability: number;
  timeoutSec: number;
}

export interface ExecutionResult {
  passed: boolean;
  score: number;
  metrics: Record<string, number>;
  executionTimeMs: number;
  error?: string;
  buildErrors?: string;
  finalState?: BlockState[];
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
      "-seed", String(req.seed),
      "-operations", String(req.operations),
      "-blocks", String(req.blocks),
      "-pages-per-block", String(req.pagesPerBlock),
      "-op-blocks", String(req.overProvisionBlocks),
      "-logical-pages", String(req.logicalPages),
      "-hot-fraction", String(req.hotFraction),
      "-hot-probability", String(req.hotProbability),
      "-timeout", String(req.timeoutSec),
    );

    return new Promise<ExecutionResult>((resolve) => {
      const child = spawn("docker", args, {
        timeout: (req.timeoutSec + 10) * 1000,
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      child.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

      child.on("error", (err) => {
        resolve({
          passed: false,
          score: 0,
          metrics: {},
          executionTimeMs: 0,
          error: `Failed to spawn docker: ${err.message}`,
        });
      });

      child.on("close", (code) => {
        // Try to parse JSON from stdout regardless of exit code — the
        // entrypoint emits JSON even on compilation failure.
        try {
          const raw = JSON.parse(stdout);
          resolve({
            passed: raw.passed ?? false,
            score: computeScore(raw),
            metrics: {
              write_amplification: raw.write_amplification ?? 0,
              block_erases: raw.total_erases ?? 0,
              wear_spread: raw.wear_spread ?? 0,
              gc_writes: raw.gc_writes ?? 0,
            },
            executionTimeMs: raw.execution_time_ms ?? 0,
            error: raw.error,
            buildErrors: raw.build_errors,
            finalState: raw.final_state ?? [],
          });
          return;
        } catch {
          // stdout wasn't valid JSON
        }

        if (timedOut) {
          resolve({
            passed: false,
            score: 0,
            metrics: {},
            executionTimeMs: (req.timeoutSec + 10) * 1000,
            error: "Execution timed out",
          });
          return;
        }

        resolve({
          passed: false,
          score: 0,
          metrics: {},
          executionTimeMs: 0,
          error: stderr || `docker exited with code ${code}`,
        });
      });

      // Handle the timeout event from spawn
      child.on("exit", () => {
        if (child.killed) timedOut = true;
      });

      // Write user code to stdin and close it.
      child.stdin.write(req.code);
      child.stdin.end();
    });
  }
}

/**
 * computeScore turns the raw runner metrics into a 0-100 score by comparing
 * against reference metrics. The reference is the greedy baseline; beating
 * it scores above 100. The weighting matches the challenge's metricsConfig.
 *
 * For now this is a simple weighted ratio. When the scoring config is loaded
 * from the challenge, this function will take it as a parameter.
 */
function computeScore(raw: Record<string, unknown>): number {
  // The reference metrics come from the greedy baseline on the same workload.
  // These are approximate values for the default workload; the real values
  // will be computed once and stored per-challenge.
  const reference = {
    write_amplification: 1.4,
    total_erases: 200,
    wear_spread: 3.0,
    gc_writes: 400,
  };

  const wa = (raw.write_amplification as number) ?? 1.4;
  const erases = (raw.total_erases as number) ?? 200;
  const wear = (raw.wear_spread as number) ?? 3.0;
  const gcw = (raw.gc_writes as number) ?? 400;

  // Each component is a ratio of reference/actual (since lower is better).
  // 1.0 means matching the reference. Capped at 2x to avoid runaway scores.
  const waRatio = Math.min(2, reference.write_amplification / Math.max(wa, 0.01));
  const eraseRatio = Math.min(2, reference.total_erases / Math.max(erases, 1));
  const wearRatio = Math.min(2, reference.wear_spread / Math.max(wear, 0.01));
  const gcRatio = Math.min(2, reference.gc_writes / Math.max(gcw, 1));

  // Weighted average, scaled to 100.
  const weighted =
    0.4 * waRatio + 0.2 * eraseRatio + 0.2 * wearRatio + 0.2 * gcRatio;

  return Math.round(weighted * 100);
}

/**
 * StubBackend is the fallback when no execution backend is configured. It
 * returns a synthetic result so the UI flow works during development.
 */
export class StubBackend implements ExecutionBackend {
  async execute(req: ExecutionRequest): Promise<ExecutionResult> {
    await new Promise((r) => setTimeout(r, 1500));
    return {
      passed: true,
      score: 75,
      metrics: {
        write_amplification: 1.35,
        block_erases: 190,
        wear_spread: 2.8,
        gc_writes: 380,
      },
      executionTimeMs: 1500,
    };
  }
}

/**
 * getExecutionBackend returns the configured backend based on environment.
 * - EXECUTION_MODE=local → LocalDockerBackend (requires Sprite image)
 * - EXECUTION_MODE=stub  → StubBackend (synthetic, for development)
 * - unset                → StubBackend
 */
let cachedBackend: ExecutionBackend | null = null;

export function getExecutionBackend(): ExecutionBackend {
  if (cachedBackend) return cachedBackend;

  const mode = process.env.EXECUTION_MODE ?? "stub";
  const image = process.env.SPRITE_IMAGE ?? "bytearena-sprite:latest";

  if (mode === "local") {
    cachedBackend = new LocalDockerBackend({ image });
  } else {
    cachedBackend = new StubBackend();
  }

  return cachedBackend;
}
