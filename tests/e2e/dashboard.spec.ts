import { test, expect } from "@playwright/test";

/**
 * The dashboard is only meaningful once something has been submitted, so this
 * makes a real submission first and then checks it shows up.
 *
 * Victim selection is the rung used because its starter code passes, which
 * means the run produces a score worth displaying rather than a failure.
 */
test("dashboard shows submission history after a submission", async ({
  page,
}) => {
  await page.goto("/challenges/victim-selection");
  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText("Device at the end of the run")).toBeVisible({
    timeout: 120_000,
  });

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");

  await expect(page.getByText("Best scores")).toBeVisible();
  await expect(page.getByText("Recent submissions")).toBeVisible();

  // The challenge title appears in both the best-score card and the
  // submissions table, so scope to the best-scores section.
  await expect(
    page
      .getByText("Best scores")
      .locator("..")
      .getByText("Victim Selection"),
  ).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "tests/e2e/__screenshots__/dashboard.png",
    fullPage: true,
  });
});
