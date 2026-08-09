/**
 * Runs the seeded starter code for every language through the real sprite
 * container, and checks that each one builds, speaks the protocol, and gets
 * graded.
 *
 * This exercises the one path that unit tests cannot: the entrypoint's build
 * commands, the SDKs as they are installed in the image, and the runner's
 * handshake — six toolchains, in the environment submissions actually use.
 *
 * Usage: npx tsx scripts/verify-languages.mts
 */
import { spawn } from "node:child_process";
import { LANGUAGE_IDS } from "../src/lib/languages";
import { COMPACTION_STARTERS, VICTIM_STARTERS } from "../prisma/seed/starters";

const IMAGE = process.env.SPRITE_IMAGE ?? "bytearena-sprite:latest";

interface Report {
  passed?: boolean;
  error?: string;
  build_output?: string;
  solution_name?: string;
  metrics?: Record<string, number>;
  baseline?: Record<string, number>;
  console?: string;
}

function runInContainer(
  language: string,
  task: string,
  code: string,
): Promise<{ report: Report | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn("docker", [
      "run", "--rm", "-i", "--network=none", "--memory=512m", "--cpus=2",
      IMAGE,
      "--language", language,
      "--task", task,
      "--seed", "7",
      "--timeout", "60",
    ]);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("close", () => {
      let report: Report | null = null;
      try {
        report = JSON.parse(stdout) as Report;
      } catch {
        // Left null; the caller prints the raw streams instead.
      }
      resolve({ report, stdout, stderr });
    });

    child.stdin.end(code);
  });
}

const CASES = [
  { task: "compaction", starters: COMPACTION_STARTERS },
  { task: "victim-selection", starters: VICTIM_STARTERS },
];

let failures = 0;

for (const { task, starters } of CASES) {
  console.log(`\n${task}`);

  const byLanguage = new Map<string, Record<string, number>>();

  for (const language of LANGUAGE_IDS) {
    const code = starters[language];
    if (!code) {
      console.log(`  ${language.padEnd(7)} no starter code seeded`);
      failures++;
      continue;
    }

    const started = Date.now();
    const { report, stdout, stderr } = await runInContainer(language, task, code);
    const elapsed = `${((Date.now() - started) / 1000).toFixed(1)}s`;

    if (!report) {
      console.log(`  ${language.padEnd(7)} FAIL  no JSON report  ${elapsed}`);
      console.log(`    stdout: ${stdout.slice(0, 300)}`);
      console.log(`    stderr: ${stderr.slice(0, 300)}`);
      failures++;
      continue;
    }

    if (report.build_output) {
      console.log(`  ${language.padEnd(7)} FAIL  did not build  ${elapsed}`);
      console.log(`    ${report.build_output.trim().split("\n").slice(0, 6).join("\n    ")}`);
      failures++;
      continue;
    }

    // The starter code is a stub, so it is allowed to grade badly. What it is
    // not allowed to do is fail to run — that would mean the SDK or the
    // toolchain is broken rather than the strategy being naive.
    const ranAtAll = report.solution_name !== undefined;
    if (!ranAtAll) {
      console.log(`  ${language.padEnd(7)} FAIL  never handshook: ${report.error}  ${elapsed}`);
      failures++;
      continue;
    }

    byLanguage.set(language, report.metrics ?? {});

    const metrics = Object.entries(report.metrics ?? {})
      .map(([k, v]) => `${k}=${Number(v.toFixed(3))}`)
      .join(" ");
    const verdict = report.passed ? "pass" : `graded-fail (${report.error})`;
    console.log(`  ${language.padEnd(7)} ok  as "${report.solution_name}"  ${verdict}  ${elapsed}`);
    if (metrics) console.log(`    ${metrics}`);
    if (report.console?.trim()) {
      console.log(`    console: ${report.console.trim().split("\n")[0]}`);
    }
  }

  failures += reportDivergence(byLanguage);
}

/**
 * Every starter implements the same strategy, so every language must produce
 * the same numbers. When they differ it is never a language difference — it is
 * one template written with different tie-breaking from the rest, which would
 * quietly make a submitter's score depend on the language they picked.
 */
function reportDivergence(byLanguage: Map<string, Record<string, number>>): number {
  const entries = [...byLanguage.entries()];
  if (entries.length < 2) return 0;

  const [referenceLanguage, reference] = entries[0];
  let diverged = 0;

  for (const [language, metrics] of entries.slice(1)) {
    const differing = Object.keys(reference).filter(
      (key) => Math.abs((metrics[key] ?? NaN) - reference[key]) > 1e-9,
    );
    if (differing.length === 0) continue;

    diverged++;
    console.log(
      `  DIVERGES  ${language} disagrees with ${referenceLanguage} on ${differing.join(", ")}`,
    );
    for (const key of differing) {
      console.log(
        `    ${key}: ${referenceLanguage}=${reference[key]}  ${language}=${metrics[key]}`,
      );
    }
  }

  return diverged;
}

console.log(
  failures === 0
    ? "\nEvery language built and ran."
    : `\n${failures} language/task combinations could not run.`,
);
process.exit(failures === 0 ? 0 : 1);
