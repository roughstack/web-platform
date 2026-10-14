import { expect, test } from "@playwright/test";

const SSD_SLUGS = ["compaction", "victim-selection", "wear-levelling"];
const EXTERNAL_SLUGS = [
  "cache-pressure-easy",
  "cache-pressure-medium",
  "chunk-store-easy",
  "deadline-scheduler-easy",
  "durable-queue-easy",
  "fair-gate-easy",
  "journal-recovery-easy",
  "lossy-link-easy",
  "lsm-compactor-easy",
  "stream-windows-easy",
];

for (const slug of [...SSD_SLUGS, ...EXTERNAL_SLUGS]) {
  test(`educational diagram renders for ${slug}`, async ({ page }) => {
    test.skip(EXTERNAL_SLUGS.includes(slug) && !process.env.BYTEARENA_ARENA_ROOTS,
      "External challenge checkout is not configured");
    await page.goto(`/challenges/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('[role="img"][aria-label]').first()).toBeVisible();
    await expect(page.getByText("Diagram data is unavailable.")).toHaveCount(0);
    if (slug === "cache-pressure-easy") {
      expect(await page.locator('[role="img"][aria-label]').first().getAttribute("aria-label")).not.toContain("..");
    }
  });
}

test("phone layout gives the problem and editor their own readable views", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/challenges/compaction");

  const diagram = page.locator('[role="img"][aria-label]').first();
  await expect(diagram).toBeVisible();
  const bounds = await diagram.boundingBox();
  expect(bounds?.width).toBeGreaterThan(300);

  await page.getByRole("button", { name: "Code & results" }).click();
  await expect(diagram).toBeHidden();
  await expect(page.locator(".monaco-editor")).toBeVisible();
  await page.getByRole("button", { name: "Focus mode" }).click();

  await page.getByRole("button", { name: "Problem", exact: true }).click();
  await expect(diagram).toBeVisible();
});
