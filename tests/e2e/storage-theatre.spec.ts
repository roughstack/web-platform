import { expect, test } from "@playwright/test";

test("storage artwork moves without requiring controls", async ({ page }) => {
  await page.goto("/");
  const scene = page.locator(".storage-theatre").first();
  await expect(scene).toHaveAttribute("data-visible", "true");
  await expect(scene.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(scene.locator(".storage-orbit")).toHaveCount(0);
  await expect(page.locator(".recovery-restored")).toHaveCount(0);
  await expect(page.locator(".exhibition-index")).toHaveCount(0);
  const stream = scene.locator(".storage-stream").first();
  const before = await stream.evaluate(el => getComputedStyle(el).strokeDashoffset);
  await expect.poll(() => stream.evaluate(el => getComputedStyle(el).strokeDashoffset)).not.toBe(before);
});

test("offscreen artwork pauses and reduced motion is static", async ({ page }) => {
  await page.goto("/");
  const scene = page.locator(".storage-theatre").first();
  await page.locator("#how-it-works").scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-visible", "false");
  await expect(scene.locator(".storage-stream").first()).toHaveCSS("animation-play-state", "paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".recovery-interrupted")).toHaveCSS("animation-name", "none");
  await expect(scene.locator(".storage-stream").first()).toHaveCSS("animation-name", "none");
});
