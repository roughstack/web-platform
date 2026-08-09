import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import type { Violation, Viewport } from "./audit-types";
import { auditPage, formatViolations } from "./layout-audit";
import { disableXray, enableXray, freezeMotion } from "./xray";
import {
  analyzeXrayScreenshot,
  annotateHotspots,
  summarizeAnalysis,
  type PixelAnalysis,
} from "./pixel-analysis";

const SHOT_ROOT = path.join(process.cwd(), "tests/e2e/__screenshots__");

export interface CertifyOptions {
  /** URL path to visit, for example "/challenges". */
  route: string;
  /** Short slug used for the screenshot folder. */
  name: string;
  viewport: Viewport;
  /** How many viewport-height steps to scroll through while auditing. */
  maxScrollSteps?: number;
}

export interface CertifyReport {
  route: string;
  viewport: string;
  violations: Violation[];
  errors: Violation[];
  warnings: Violation[];
  pixel: PixelAnalysis;
  screenshotDir: string;
}

/** Waits until the page has genuinely settled: fonts loaded, images decoded, no motion. */
async function waitForStablePaint(page: Page): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("load");
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(
      images.filter((img) => !img.complete).map((img) => img.decode().catch(() => undefined)),
    );
  });
  await freezeMotion(page);
  // One animation frame so the frozen styles are actually committed before measuring.
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
}

/**
 * Runs the complete verification pass for one route at one viewport:
 * geometric audit at every scroll position, plus normal and x-ray screenshots
 * with boundary-density analysis.
 *
 * Throws with a formatted report if any error-severity violation is found.
 */
export async function certifyRoute(page: Page, opts: CertifyOptions): Promise<CertifyReport> {
  const { route, name, viewport, maxScrollSteps = 6 } = opts;

  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route);
  await waitForStablePaint(page);

  const dir = path.join(SHOT_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });

  // --- Pass 1: audit the top of the page, where nothing should overlap at all.
  const topResult = await auditPage(page, viewport, { allowStickyOverlap: false });
  const violations: Violation[] = [...topResult.violations];

  // --- Pass 2: scroll through the page. Sticky chrome legitimately covers content here.
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const steps = Math.min(maxScrollSteps, Math.ceil(pageHeight / viewport.height) - 1);

  for (let step = 1; step <= Math.max(0, steps); step++) {
    const y = step * viewport.height;
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    const scrolled = await auditPage(page, viewport, { allowStickyOverlap: true });
    for (const violation of scrolled.violations) {
      // Deduplicate against what we already found at the top of the page.
      const seen = violations.some(
        (existing) => existing.kind === violation.kind && existing.selector === violation.selector,
      );
      if (!seen) {
        violations.push({
          ...violation,
          detail: { ...violation.detail, foundAtScrollY: y },
        });
      }
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));

  // --- Screenshots: clean, then x-ray, then annotated hotspots.
  await page.screenshot({ path: path.join(dir, `${viewport.name}.png`), fullPage: true });

  await enableXray(page);
  const xrayBuffer = await page.screenshot({ fullPage: true });
  fs.writeFileSync(path.join(dir, `${viewport.name}.xray.png`), xrayBuffer);
  await disableXray(page);

  const pixel = analyzeXrayScreenshot(xrayBuffer);
  if (pixel.hotspots.length > 0) {
    fs.writeFileSync(
      path.join(dir, `${viewport.name}.xray-hotspots.png`),
      annotateHotspots(xrayBuffer, pixel),
    );
  }

  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  const report: CertifyReport = {
    route,
    viewport: viewport.name,
    violations,
    errors,
    warnings,
    pixel,
    screenshotDir: dir,
  };

  fs.writeFileSync(
    path.join(dir, `${viewport.name}.report.json`),
    JSON.stringify(
      {
        route,
        viewport: viewport.name,
        errorCount: errors.length,
        warningCount: warnings.length,
        pixelSummary: summarizeAnalysis(pixel),
        violations,
      },
      null,
      2,
    ),
  );

  console.log(
    `  ${name} @ ${viewport.name}: ${errors.length} error(s), ${warnings.length} warning(s) | ${summarizeAnalysis(pixel)}`,
  );

  if (errors.length > 0) {
    throw new Error(
      formatViolations(route, viewport, { violations: errors, stats: topResult.stats }),
    );
  }

  return report;
}
