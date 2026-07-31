import { test, expect } from "@playwright/test";

const GREEDY_CODE = `package solution

import "github.com/bytearena/sprite/ftl"

type Policy struct{}
func (Policy) Name() string { return "greedy" }
func (Policy) Reclaim(d *ftl.Device, stats ftl.DeviceStats) (int, error) {
	best := -1; maxInvalid := -1
	for _, b := range stats.Blocks {
		if b.Invalid > maxInvalid { maxInvalid = b.Invalid; best = b.Index }
	}
	if best < 0 || maxInvalid == 0 { return 0, ftl.ErrPolicyStalled }
	for _, ppn := range d.ValidPagesIn(best) {
		if err := d.MigratePage(ppn); err != nil { return 0, err }
	}
	return best, nil
}
func New() ftl.Policy { return Policy{} }
`;

test("dashboard shows submission history after a submission", async ({ page }) => {
  // First, submit code so the dashboard has data.
  await page.goto("/challenges/ssd-ftl-gc");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  await page.evaluate((code) => {
    const w = window as unknown as { monaco?: { editor?: { getModels?: () => Array<{ setValue: (s: string) => void }> } } };
    const models = w.monaco?.editor?.getModels?.();
    if (models && models.length > 0) {
      models[0].setValue(code);
    }
  }, GREEDY_CODE);
  await page.waitForTimeout(500);

  await page.getByRole("button", { name: /submit/i }).click();
  await expect(page.getByText("Device state after run")).toBeVisible({
    timeout: 90_000,
  });
  await page.waitForTimeout(2000);

  // Now navigate to the dashboard.
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "tests/e2e/__screenshots__/dashboard.png",
    fullPage: true,
  });

  // The dashboard should show the best-score card and the recent submission.
  await expect(page.getByText("Best scores")).toBeVisible();
  await expect(page.getByText("Recent submissions")).toBeVisible();
  // The challenge title appears in both the best-score card and the
  // submissions table, so scope to the best-scores section.
  await expect(page.getByText("Best scores").locator("..").getByText("Flash Translation Layer: Garbage Collection")).toBeVisible();
});
