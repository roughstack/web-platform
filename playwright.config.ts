import { defineConfig, devices } from "@playwright/test";

// Port 3100 rather than 3000: the default is commonly occupied by other local
// stacks, and a fixed non-default port keeps the audit reproducible.
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  // The layout auditor measures real geometry, so parallel workers sharing a display
  // would make viewport switches race. Determinism matters more than speed here.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "tests/e2e/__artifacts__/results.json" }],
  ],
  outputDir: "tests/e2e/__artifacts__/test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // Deterministic rendering across machines.
    deviceScaleFactor: 1,
    timezoneId: "UTC",
    locale: "en-US",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Reuses the container's dev server when docker compose is already up; otherwise
  // falls back to starting one locally so the suite is runnable either way.
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
