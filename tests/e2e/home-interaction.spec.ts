import { expect, test } from "@playwright/test";

test("recovery story replaces the elementary cache demo", async ({ page }) => {
  await page.goto("/");
  const story = page.locator("#how-it-works");
  await expect(story.getByRole("heading")).toHaveText("The power dies.Your file doesn’t.");
  await expect(story.getByRole("link", { name: "Explore crash recovery" })).toHaveAttribute("href", "/challenges/journal-recovery-easy");
  await expect(story.getByRole("img")).toHaveAccessibleName(/journal keeps a record/);
  await expect(story.getByRole("button")).toHaveCount(0);
});

test("landing artwork fits a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
