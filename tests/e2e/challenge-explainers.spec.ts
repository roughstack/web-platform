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

  test("the finite story settles and can be replayed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/challenges/cache-pressure-easy");
    await expect(page.getByText("Insert C. B leaves because one read changed the order.")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Replay" }).click();
    await expect(page.getByText("A is oldest. B is newest. The 66-byte budget is full.")).toBeVisible();
  });
});
