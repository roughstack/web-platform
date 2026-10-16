import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test, type APIRequestContext } from "@playwright/test";

const enabled = process.env.ROUGHSTACK_REAL_ARENA_E2E === "1";
const challengeRoot = path.resolve(
  process.env.ROUGHSTACK_CHALLENGES_ROOT ?? "../challenges",
);
const arenaRoot = path.join(challengeRoot, "challenges/cache-pressure-easy");

interface SubmissionResponse {
  id: string;
}

interface ResultResponse {
  status: string;
  error?: string;
  result?: {
    status: string;
    metrics: Record<string, number>;
    detail?: { run?: { workload_id?: string; duration_ns?: number } };
    message?: string;
  };
}

async function submitAndWait(
  request: APIRequestContext,
  code: string,
): Promise<ResultResponse> {
  const submission = await request.post("/api/submissions", {
    data: { slug: "cache-pressure-easy", language: "GO", code },
  });
  expect(submission.ok(), await submission.text()).toBe(true);
  const { id } = (await submission.json()) as SubmissionResponse;
  expect(id).toBeTruthy();

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const response = await request.get(`/api/submissions/${id}`);
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as ResultResponse;
    if (body.status === "done" || body.status === "error") return body;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Submission ${id} did not finish within 180 seconds`);
}

test("a contributor can run a public baseline and reject the learner scaffold", async ({
  request,
}) => {
  test.skip(!enabled, "Set ROUGHSTACK_REAL_ARENA_E2E=1 for the local Docker acceptance check");
  test.setTimeout(420_000);

  const page = await request.get("/challenges/cache-pressure-easy");
  expect(page.ok(), await page.text()).toBe(true);

  const baseline = await readFile(path.join(arenaRoot, "starter/cache.go"), "utf8");
  const scaffold = await readFile(path.join(arenaRoot, "learner/starter.go"), "utf8");
  expect(scaffold).not.toBe(baseline);

  const passing = await submitAndWait(request, baseline);
  expect(passing, JSON.stringify(passing)).toMatchObject({
    status: "done",
    result: { status: "passed" },
  });
  expect(passing.result?.detail?.run?.workload_id).toBeTruthy();
  expect(Object.keys(passing.result?.metrics ?? {}).length).toBeGreaterThan(0);

  const failing = await submitAndWait(request, scaffold);
  expect(failing.status, JSON.stringify(failing)).toBe("done");
  expect(failing.result?.status).toBe("failed");
  expect(failing.result?.message).toMatch(/TODO|build|test|failed/i);
});
