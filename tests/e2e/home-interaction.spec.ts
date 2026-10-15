import { expect, test } from "@playwright/test";

test("cache trace explains how a read changes eviction", async ({ page }) => {
  await page.goto("/");

  const trace = page.getByRole("group", { name: "Replay cache operations" });
  const entries = page.getByLabel("Cache entries, oldest to newest");

  await expect(trace.getByRole("button", { name: "01 put A+B" })).toHaveAttribute("aria-pressed", "true");
  await expect(entries).toContainText("Aoldest");
  await expect(entries).toContainText("Bnewest");

  await trace.getByRole("button", { name: "02 get A" }).click();
  await expect(entries).toContainText("Boldest");
  await expect(entries).toContainText("Anewest");
  await expect(page.getByText("Reading A makes it newest.")).toBeVisible();

  await trace.getByRole("button", { name: "03 put C" }).click();
  await expect(entries).toContainText("Aoldest");
  await expect(entries).toContainText("Cnewest");
  await expect(page.getByText("evicted: B")).toBeVisible();
});

test("cache trace controls remain usable at narrow phone width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const trace = page.getByRole("group", { name: "Replay cache operations" });
  await trace.getByRole("button", { name: "03 put C" }).click();
  await expect(page.getByText("C arrives. B leaves.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
