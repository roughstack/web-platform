import { expect, test } from "@playwright/test";

test("memory compaction preserves the values and their order, then resets", async ({ page }) => {
  await page.goto("/");
  const blocks = page.locator("[data-memory-block]");
  const slots = () => blocks.evaluateAll((items) => items.map((item) => item.getAttribute("data-slot")));
  await expect(blocks).toHaveCount(6);
  expect(await slots()).toEqual(["0", "2", "4", "7", "9", "11"]);
  await page.getByRole("button", { name: "Compact the memory" }).click();
  expect(await slots()).toEqual(["0", "1", "2", "3", "4", "5"]);
  expect(await blocks.allTextContents()).toEqual(["A", "B", "C", "D", "E", "F"]);
  await page.getByRole("button", { name: "Scatter again" }).click();
  expect(await slots()).toEqual(["0", "2", "4", "7", "9", "11"]);
});

test("compaction supports keyboard and reduced motion on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Compact the memory" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Scatter again" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator("[data-memory-block]").first().evaluate((element) => getComputedStyle(element).transitionProperty)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
