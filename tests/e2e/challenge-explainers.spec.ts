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

  test("the finite story settles and can be replayed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/challenges/cache-pressure-easy");
    await expect(page.getByText("Insert C. B leaves because one read changed the order.")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(page.getByText("A is oldest. B is newest. The 66-byte budget is full.")).toBeVisible();
  });
});
