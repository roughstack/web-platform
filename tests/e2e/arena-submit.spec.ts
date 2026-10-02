import { test, expect } from "@playwright/test";

/**
 * Submits real code to the real container, once per rung of the ladder.
 *
 * The tests deliberately submit the seeded starter code untouched rather than
 * typing into Monaco. Injecting source through the editor tested the editor;
 * submitting what a visitor is actually handed tests the thing that matters —
 * that the starter every new solver begins from is wired to a task that can
 * grade it.
 *
 * Each rung asserts on its own illustration, because the whole point of the
 * results panel is that it draws the problem rather than dumping numbers.
 */

test.describe("arena submission", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  test("victim selection grades the starter policy and draws the device", async ({
    page,
  }) => {
    await page.goto("/challenges/victim-selection");
    await page.getByRole("button", { name: /submit/i }).click();

    // Generous, because a cold container has to compile before it can run.
    await expect(
      page.getByText("Device at the end of the run"),
    ).toBeVisible({ timeout: 120_000 });

    // The starter ships a working greedy policy, so this rung should pass and
    // report the measurement the challenge is actually about.
    await expect(page.getByText(/write amplification/i).first()).toBeVisible();

    await page.screenshot({
      path: "tests/e2e/__screenshots__/arena-victim-selection-result.png",
      fullPage: false,
    });
  });

  test("compaction explains why an empty solution is wrong", async ({
    page,
  }) => {
    await page.goto("/challenges/compaction");
    await page.getByRole("button", { name: /submit/i }).click();

    // The easy rung's starter is a stub with a TODO, so the first run is
    // expected to fail. What it must not do is fail opaquely: the solver needs
    // to see which slot is wrong, not just that something was.
    await expect(page.getByText("After your moves")).toBeVisible({
      timeout: 120_000,
    });
    await expect(page.getByText(/must end up in slots/i)).toBeVisible();

    await page.screenshot({
      path: "tests/e2e/__screenshots__/arena-compaction-result.png",
      fullPage: false,
    });
  });

  test("a public arena uses the complete challenge workspace", async ({ page }) => {
    await page.goto("/challenges");

    const card = page.getByRole("link", {
      name: /Difficulty: Easy Cache Cache Pressure/,
    });
    await expect(card).toBeVisible();
    await expect(card).not.toContainText("Cache Pressure — Easy");
    await card.click();

    await expect(page).toHaveURL(/\/challenges\/cache-pressure-easy$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Cache Pressure" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Difficulty" })).toContainText(
      "medium",
    );
    await expect(page.getByRole("tab", { name: "Discussion" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Submissions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "A cache read path" })).toBeVisible();
    await expect(page.getByText("The invariant", { exact: true })).toBeVisible();
    await expect(page.getByText("What you implement", { exact: true })).toBeVisible();
    await expect(page.getByText("A good way in", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Submit" }).click();
    const metrics = page.locator("dl");
    await expect(metrics).toBeVisible({ timeout: 120_000 });
    await expect(metrics).toContainText("Backing reads");
    await expect(metrics).toContainText("Peak accounted bytes");
    await expect(
      page.locator("section").filter({ has: metrics }).getByText("Passed", { exact: true }),
    ).toBeVisible();
  });
});
