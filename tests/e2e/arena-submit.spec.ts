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

test("arena submission shows block grid", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/challenges/ssd-ftl-gc");
  await page.waitForLoadState("networkidle");

  // Wait for Monaco to load
  await page.waitForTimeout(3000);

  // Set the editor content by directly accessing the Monaco model via
  // the AMD loader's global `monaco` (exposed by @monaco-editor/react's
  // default loader). This is the most reliable way to programmatically
  // replace Monaco content in tests — keyboard paste via the hidden
  // textarea is flaky because the textarea is readonly/aria-hidden.
  await page.evaluate((code) => {
    const w = window as unknown as { monaco?: { editor?: { getModels?: () => Array<{ setValue: (s: string) => void }> } } };
    const models = w.monaco?.editor?.getModels?.();
    if (models && models.length > 0) {
      models[0].setValue(code);
    } else {
      throw new Error("Monaco model not found on window.monaco");
    }
  }, GREEDY_CODE);
  await page.waitForTimeout(500);

  // Click submit
  await page.getByRole("button", { name: /submit/i }).click();

  // Wait for the results panel to show the block grid (up to 90s for Docker run)
  await expect(page.getByText("Device state after run")).toBeVisible({
    timeout: 90_000,
  });

  await page.waitForTimeout(1500);

  await page.screenshot({
    path: "tests/e2e/__screenshots__/arena-result.png",
    fullPage: true,
  });
});
