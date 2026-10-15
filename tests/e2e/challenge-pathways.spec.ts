import { expect, test } from "@playwright/test";

test("the library groups every published challenge without changing its route", async ({ page }) => {
  await page.goto("/challenges");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Follow your curiosity down the stack.");
  const pathways = page.locator('section[aria-labelledby^="pathway-"]');
  await expect(pathways).toHaveCount(4);
  const links = pathways.locator("li > a");
  await expect(links).toHaveCount(13);
  expect(await links.evaluateAll((elements) => elements.every((element) => element.getAttribute("href")?.startsWith("/challenges/")))).toBe(true);
  await expect(page.getByRole("link", { name: /Cache Pressure/ }).first()).toHaveAttribute("href", "/challenges/cache-pressure-easy");
  await expect(page.getByRole("link", { name: /Lossy Link/ })).toHaveAttribute("href", "/challenges/lossy-link-easy");
});

test("the library remains readable on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/challenges");
  await expect(page.getByRole("heading", { name: "Memory has a cost." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
