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

test("a selected block keeps its identity through layer separation and compaction", async ({ page }) => {
  await page.goto("/");
  const block = page.getByRole("button", { name: /^Inspect block C,/ });
  await block.focus();
  await page.keyboard.press("Enter");
  await expect(block).toHaveAttribute("aria-pressed", "true");
  const inspector = page.locator(".memory-inspector");
  await expect(inspector).toContainText("0x04");
  const layers = page.getByRole("slider", { name: "Pull apart" });
  await layers.focus();
  await page.keyboard.press("End");
  await expect(layers).toHaveValue("100");
  await expect(page.locator(".memory-exhibit")).toHaveAttribute("data-separation", "100");
  await page.getByRole("button", { name: "Compact the memory" }).click();
  await expect(inspector).toContainText("0x02");
  await expect(inspector).toContainText("Moved from address 4. The data is unchanged.");
  await expect(block).toHaveAttribute("aria-pressed", "true");
});

test("reduced motion keeps inspection without entrance or camera animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".memory-arrival").first().evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.getByRole("button", { name: /^Inspect block F,/ }).click();
  await expect(page.locator(".memory-inspector")).toContainText("0x0B");
  expect(await page.locator(".memory-world").evaluate((element) => getComputedStyle(element).transform)).toBe("none");
});
