import { expect, test } from "@playwright/test";

test("half-adder reveals all four binary outcomes", async ({ page }) => {
  await page.goto("/");

  const a = page.getByRole("button", { name: /^Input A,/ });
  const b = page.getByRole("button", { name: /^Input B,/ });
  const sum = page.getByTestId("sum-output");
  const carry = page.getByTestId("carry-output");

  await expect(sum).toHaveText("0");
  await expect(carry).toHaveText("0");
  await expect(page.getByTestId("truth-row-00")).toHaveAttribute("aria-current", "true");

  await b.click();
  await expect(sum).toHaveText("1");
  await expect(carry).toHaveText("0");
  await expect(page.getByTestId("truth-row-01")).toHaveAttribute("aria-current", "true");

  await a.click();
  await expect(sum).toHaveText("0");
  await expect(carry).toHaveText("1");
  await expect(page.getByTestId("truth-row-11")).toHaveAttribute("aria-current", "true");

  await b.click();
  await expect(sum).toHaveText("1");
  await expect(carry).toHaveText("0");
  await expect(page.getByTestId("truth-row-10")).toHaveAttribute("aria-current", "true");
});

test("half-adder switches work from keyboard without causing phone overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  const a = page.getByRole("button", { name: /^Input A,/ });
  await a.focus();
  await page.keyboard.press("Enter");
  await expect(a).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("sum-output")).toHaveText("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test("half-adder signal does not animate under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: /^Input A,/ }).click();
  const signal = page.locator(".circuit-path").first();
  expect(await signal.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});
