import { expect, test } from "@playwright/test";

test.describe("challenge explainers", () => {
  test.skip(!process.env.BYTEARENA_ARENA_ROOTS, "External challenge checkout is not configured");

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("cache tiers show different final mechanisms", async ({ page }) => {
    await page.goto("/challenges/cache-pressure-easy");
    await expect(page.getByRole("img", { name: /Inserting C evicts B/ })).toBeVisible();
    await expect(page.getByText("Insert C. B leaves because one read changed the order.")).toBeVisible();

    await page.goto("/challenges/cache-pressure-medium");
    await expect(page.getByRole("img", { name: /one-time scan of S1, S2, S3/ })).toBeVisible();
    await expect(page.getByText("LRU: 3 misses")).toBeVisible();
    await expect(page.getByText("protected: 3 hits")).toBeVisible();
  });

  test("a lost acknowledgement never delivers the same payload twice", async ({ page }) => {
    await page.goto("/challenges/lossy-link-easy");
    await expect(page.getByRole("img", { name: /Receiver recognizes the duplicate/ })).toBeVisible();
    await expect(page.getByText("delivered: 1 copy")).toBeVisible();
    await expect(page.getByText("duplicate discarded")).toBeVisible();
  });

  test("recovery stops before a torn journal tail", async ({ page }) => {
    await page.goto("/challenges/journal-recovery-easy");
    await expect(page.getByRole("img", { name: /LSN 3 ends halfway through its payload/ })).toBeVisible();
    await expect(page.getByText("recovered prefix: LSN 1–2")).toBeVisible();
    await expect(page.getByText("Apply LSN 1 and 2 only. Report a torn tail.")).toBeVisible();
  });

  test("an LSM selection includes both Level-1 overlaps", async ({ page }) => {
    await page.goto("/challenges/lsm-compactor-easy");
    await expect(page.getByRole("img", { name: /Both X and Y must be included/ })).toBeVisible();
    await expect(page.getByText("selected union: 10–50")).toBeVisible();
    await expect(page.getByText("include X + Y")).toBeVisible();
  });

  test("watermark 10 emits the first window and retains the second", async ({ page }) => {
    await page.goto("/challenges/stream-windows-easy");
    await expect(page.getByRole("img", { name: /Watermark 10 finalizes and emits the first aggregate/ })).toBeVisible();
    await expect(page.getByText("emitted · state freed")).toBeVisible();
    await expect(page.getByText("right window live")).toBeVisible();
    await expect(page.getByText("count 1 · sum 4")).toBeVisible();
    await expect(page.getByText("count 1 · sum 7")).toBeVisible();
  });

  test("chunk read decodes only the indexed block", async ({ page }) => {
    await page.goto("/challenges/chunk-store-easy");
    await expect(page.getByRole("img", { name: /Only block 1 is verified and decoded/ })).toBeVisible();
    await expect(page.getByText("CRC verified · CD copied")).toBeVisible();
    await expect(page.getByText("result: CD")).toBeVisible();
  });

  test("non-preemptive worker makes its next choice at tick six", async ({ page }) => {
    await page.goto("/challenges/deadline-scheduler-easy");
    await expect(page.getByRole("img", { name: /C arrives at tick 1 and waits/ })).toBeVisible();
    await expect(page.getByText("next dispatch @ 6")).toBeVisible();
  });

  test("nack returns A behind B and keeps capacity occupied", async ({ page }) => {
    await page.goto("/challenges/durable-queue-easy");
    await expect(page.getByRole("img", { name: /ready order B then A/ })).toBeVisible();
    await expect(page.getByText("resident: A + B")).toBeVisible();
    await expect(page.getByText("old A token: stale")).toBeVisible();
  });

  test("the token gate admits the retry at the exact refill tick", async ({ page }) => {
    await page.goto("/challenges/fair-gate-easy");
    await expect(page.getByRole("img", { name: /earliest RetryAt tick three/ })).toBeVisible();
    await expect(page.getByText("3 spent · 0 left")).toBeVisible();
    await expect(page.getByText("ALLOWED", { exact: true })).toBeVisible();
  });

  test("the finite story settles and can be replayed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/challenges/cache-pressure-easy");
    await expect(page.getByText("Insert C. B leaves because one read changed the order.")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(page.getByText("A is oldest. B is newest. The 66-byte budget is full.")).toBeVisible();
  });
});

test.describe("ranked SSD ladder explainers", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("compaction fills three holes without moving the resident value", async ({ page }) => {
    await page.goto("/challenges/compaction");
    await expect(page.getByRole("img", { name: /Slot 3 remains in place/ })).toBeVisible();
    await expect(page.getByText("free suffix: 7")).toBeVisible();
    await expect(page.getByText("Move slot 11 into slot 4. Slot 3 never moves.")).toBeVisible();
  });

  test("victim selection migrates one live page before erase", async ({ page }) => {
    await page.goto("/challenges/victim-selection");
    await expect(page.getByRole("img", { name: /Block 1 would need two migrations/ })).toBeVisible();
    await expect(page.getByText("+7 net free")).toBeVisible();
    await expect(page.getByText("Erase the whole block. Seven net free pages are gained.")).toBeVisible();
  });

  test("wear-aware choice pays one migration to avoid the worst-worn block", async ({ page }) => {
    await page.goto("/challenges/wear-levelling");
    await expect(page.getByRole("img", { name: /not a guaranteed global optimum/ })).toBeVisible();
    await expect(page.getByText("wear-aware → block 1")).toBeVisible();
    await expect(page.getByText("+1 migration")).toBeVisible();
  });

  test("compaction's finite sequence settles and replays", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/challenges/compaction");
    await expect(page.getByText("Move slot 11 into slot 4. Slot 3 never moves.")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(page.getByText("Five live values; three sit beyond the required prefix.")).toBeVisible();
  });
});
