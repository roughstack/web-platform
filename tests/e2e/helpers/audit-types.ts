/**
 * Shared types for the layout auditor.
 *
 * These are type-only declarations, so they erase at compile time and are safe to
 * reference from functions that get serialized into the browser by Playwright.
 */

export type ViolationKind =
  | "occlusion"
  | "horizontal-overflow"
  | "text-clipping"
  | "low-contrast"
  | "off-viewport"
  | "tap-target-too-small"
  | "border-density";

export type Severity = "error" | "warning";

export interface Violation {
  kind: ViolationKind;
  severity: Severity;
  /** CSS-ish path identifying the offending element. */
  selector: string;
  /** Human-readable explanation of what is wrong. */
  message: string;
  /** Bounding box at the time of detection, when applicable. */
  rect?: { x: number; y: number; width: number; height: number };
  /** Extra structured context, varies by kind. */
  detail?: Record<string, unknown>;
}

export interface Viewport {
  name: string;
  width: number;
  height: number;
  isMobile: boolean;
}

export interface AuditOptions {
  /** Skip tap-target checks on non-mobile viewports. */
  isMobile: boolean;
  /** Minimum WCAG contrast ratio for normal-size text. */
  contrastNormal: number;
  /** Minimum WCAG contrast ratio for large text (>=18.66px bold or >=24px). */
  contrastLarge: number;
  /** Minimum interactive target edge length in CSS pixels on mobile. */
  minTapTarget: number;
  /**
   * Fraction of sampled interior points that must be occluded by an unrelated
   * element before we call it a genuine overlap.
   */
  occlusionThreshold: number;
  /**
   * When the page is scrolled, content passing beneath a sticky or fixed header is
   * intended behaviour rather than a defect. Set this while auditing scrolled
   * positions so those blockers are not reported.
   */
  allowStickyOverlap: boolean;
}

export interface AuditResult {
  violations: Violation[];
  /** Counters useful for spotting regressions even when nothing fails. */
  stats: {
    elementsScanned: number;
    documentScrollWidth: number;
    documentClientWidth: number;
  };
}
