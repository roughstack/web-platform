import { spawn } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertResultMatchesManifest, parseArenaResult } from "@/lib/arena/result";

import type { ExecutionResult } from "./backend";

const MAX_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_IMAGE = "golang:1.24-alpine";

interface CommandResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly outputExceeded: boolean;
}

export interface ArenaExecutionOptions {
  readonly arenaId: string;
  readonly code: string;
  readonly seed: number;
}

export async function executeArenaSubmission(
  options: ArenaExecutionOptions,
): Promise<ExecutionResult> {
  const { loadArenaChallengeSource } = await import("@/lib/arena/challenge");
  const source = await loadArenaChallengeSource(options.arenaId);
  if (!source) throw new Error(`Unknown public arena ${options.arenaId}`);

  const repositoryRoot = path.resolve(source.loaded.arenaRoot, "../..");
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "bytearena-run-"));
  const workspace = path.join(temporaryRoot, "workspace");

  try {
    await cp(repositoryRoot, workspace, {
      recursive: true,
      filter: (candidate) => !isIgnoredSourcePath(repositoryRoot, candidate),
    });

    const arenaRelative = path.relative(repositoryRoot, source.loaded.arenaRoot);
    const entrypoint = safeWorkspacePath(
      workspace,
      path.join(arenaRelative, source.entry.manifest.submission.entrypoint),
    );
    await writeFile(entrypoint, options.code, "utf8");

    const { manifest } = source.entry;
    const build = await runInContainer(
      workspace,
      manifest.build.command,
      manifest.build.timeoutSeconds,
      manifest.resources,
    );
    if (build.timedOut || build.outputExceeded || build.exitCode !== 0) {
      return failedExecution(
        build.timedOut
          ? "Build timed out"
          : build.outputExceeded
            ? "Build output exceeded 1 MiB"
            : "The submission did not compile",
        build.stderr || build.stdout,
      );
    }

    const run = await runInContainer(
      workspace,
      withSeed(manifest.run.command, options.seed),
      manifest.run.timeoutSeconds,
      manifest.resources,
    );
    if (run.timedOut || run.outputExceeded) {
      return failedExecution(
        run.timedOut ? "Execution timed out" : "Execution output exceeded 1 MiB",
        run.stderr,
      );
    }

    let result;
    try {
      result = parseArenaResult(run.stdout.trim());
      assertResultMatchesManifest(result, manifest);
    } catch (error) {
      return failedExecution(
        error instanceof Error ? error.message : "Arena returned an invalid result",
        run.stderr || run.stdout,
      );
    }

    const passed = result.verdict === "pass" && run.exitCode === 0;
    return {
      passed,
      score: passed ? result.score : 0,
      metrics: result.metrics,
      baseline: {},
      executionTimeMs: Math.ceil(result.run.duration_ns / 1_000_000),
      error: passed ? undefined : result.violations.join("\n") || "Correctness checks failed",
      console: run.stderr,
      detail: { violations: result.violations, run: result.run },
    };
  } finally {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

function isIgnoredSourcePath(repositoryRoot: string, candidate: string): boolean {
  const relative = path.relative(repositoryRoot, candidate);
  if (!relative) return false;
  return relative.split(path.sep).some((part) =>
    [".git", ".cache", "coverage", "dist", "tmp"].includes(part),
  );
}

export function safeWorkspacePath(workspace: string, relativePath: string): string {
  const candidate = path.resolve(workspace, relativePath);
  const relative = path.relative(workspace, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Arena entrypoint resolves outside the execution workspace");
  }
  return candidate;
}

export function withSeed(command: readonly string[], seed: number): string[] {
  const updated = [...command];
  const flag = updated.indexOf("--seed");
  if (flag >= 0 && flag + 1 < updated.length) {
    updated[flag + 1] = String(seed);
  }
  return updated;
}

async function runInContainer(
  workspace: string,
  command: readonly string[],
  timeoutSeconds: number,
  resources: {
    readonly cpuCount: number;
    readonly memoryMiB: number;
    readonly diskMiB: number;
    readonly network: "disabled" | "arena-only";
    readonly maxProcesses: number;
  },
): Promise<CommandResult> {
  if (resources.network !== "disabled") {
    throw new Error("arena-only networking is not supported by the local runner");
  }

  const image = process.env.ARENA_RUNNER_IMAGE ?? DEFAULT_IMAGE;
  const args = [
    "run",
    "--rm",
    "--interactive",
    "--network=none",
    "--read-only",
    "--security-opt=no-new-privileges",
    "--cap-drop=ALL",
    `--cpus=${resources.cpuCount}`,
    `--memory=${resources.memoryMiB}m`,
    `--pids-limit=${resources.maxProcesses}`,
    `--tmpfs=/tmp:rw,exec,nosuid,nodev,size=${resources.diskMiB}m`,
    `--tmpfs=/workspace:rw,exec,nosuid,nodev,size=${resources.diskMiB}m,mode=1777`,
    "--user=65534:65534",
    "--env=HOME=/tmp",
    "--env=GOCACHE=/tmp/go-cache",
    "--env=GOTMPDIR=/tmp",
    "--env=GOMAXPROCS=1",
    "--env=GOFLAGS=-p=1",
    "--workdir=/workspace",
    image,
    "sh",
    "-c",
    'tar -xf - -C /workspace && exec "$@"',
    "bytearena-entrypoint",
    ...command,
  ];

  return captureContainerWithWorkspace(workspace, args, timeoutSeconds * 1000);
}

function captureContainerWithWorkspace(
  workspace: string,
  dockerArgs: readonly string[],
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const archive = spawn("tar", ["-C", workspace, "-cf", "-", "."], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const child = spawn("docker", dockerArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      timeout: timeoutMs,
      killSignal: "SIGKILL",
    });
    archive.stdout.pipe(child.stdin);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputExceeded = false;

    const append = (current: string, chunk: Buffer): string => {
      if (Buffer.byteLength(current) + chunk.byteLength > MAX_OUTPUT_BYTES) {
        outputExceeded = true;
        archive.kill("SIGKILL");
        child.kill("SIGKILL");
        return current;
      }
      return current + chunk.toString();
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });
    archive.stderr.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });
    child.on("timeout", () => {
      timedOut = true;
      archive.kill("SIGKILL");
    });
    archive.on("error", (error) => {
      child.kill("SIGKILL");
      reject(error);
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE") reject(error);
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (archive.exitCode === null) archive.kill("SIGKILL");
      resolve({ exitCode, stdout, stderr, timedOut, outputExceeded });
    });
  });
}

function failedExecution(error: string, buildErrors: string): ExecutionResult {
  return {
    passed: false,
    score: 0,
    metrics: {},
    baseline: {},
    executionTimeMs: 0,
    error,
    buildErrors,
  };
}
