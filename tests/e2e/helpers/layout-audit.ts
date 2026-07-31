import type { Page } from "@playwright/test";
import type { AuditOptions, AuditResult, Violation, Viewport } from "./audit-types";

export const DEFAULT_AUDIT_OPTIONS: AuditOptions = {
  isMobile: false,
  contrastNormal: 4.5,
  contrastLarge: 3,
  minTapTarget: 44,
  occlusionThreshold: 0.5,
  allowStickyOverlap: false,
};

/**
 * The audit body. This entire function is serialized and executed inside the page,
 * so it must not reference anything from the module scope.
 */
function browserAudit(opts: AuditOptions): AuditResult {
  const violations: Violation[] = [];
  const TOLERANCE = 1;

  // ---------------------------------------------------------------- utilities

  function selectorFor(el: Element): string {
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && depth < 4) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const cls = (node.getAttribute("class") || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join(".");
      if (cls) part += `.${cls}`;
      const testId = node.getAttribute("data-testid");
      if (testId) part += `[data-testid="${testId}"]`;
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(" > ");
  }

  function isVisible(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.display === "none") return false;
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    if (parseFloat(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    return true;
  }

  /** Screen-reader-only patterns that are intentionally hidden off-screen or clipped. */
  function isScreenReaderOnly(el: Element): boolean {
    const style = getComputedStyle(el);
    if (style.clipPath && style.clipPath !== "none") return true;
    if (style.clip && style.clip !== "auto") return true;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 2 && rect.height <= 2) return true;
    return false;
  }

  /**
   * Elements injected by tooling rather than the application: the Next.js dev
   * overlay, its route announcer, and browser extension roots. They are not part
   * of the product and would otherwise be reported as covering real content.
   */
  function isToolingArtifact(el: Element): boolean {
    return (
      el.closest(
        "nextjs-portal, next-route-announcer, [data-nextjs-dialog-overlay], [data-nextjs-toast], #__next-build-watcher",
      ) !== null
    );
  }

  function isIgnored(el: Element): boolean {
    return el.closest("[data-audit-ignore]") !== null || isToolingArtifact(el);
  }

  function hasDirectText(el: Element): boolean {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  const INTERACTIVE_SELECTOR =
    'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"], [tabindex]:not([tabindex="-1"])';

  function isInteractive(el: Element): boolean {
    return el.matches(INTERACTIVE_SELECTOR);
  }

  /** True if the element or any ancestor is pinned to the viewport. */
  function isPinned(el: Element): boolean {
    let node: Element | null = el;
    while (node && node !== document.body) {
      const position = getComputedStyle(node).position;
      if (position === "fixed" || position === "sticky") return true;
      node = node.parentElement;
    }
    return false;
  }

  // -------------------------------------------------------- colour + contrast

  function parseColor(input: string): [number, number, number, number] | null {
    const match = input.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length < 3) return null;
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }

  function blend(
    fg: [number, number, number, number],
    bg: [number, number, number],
  ): [number, number, number] {
    const a = fg[3];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
    ];
  }

  /** Walks ancestors until an opaque background is found, compositing along the way. */
  function effectiveBackground(el: Element): [number, number, number] {
    const stack: [number, number, number, number][] = [];
    let node: Element | null = el;
    while (node) {
      const bg = parseColor(getComputedStyle(node).backgroundColor);
      if (bg && bg[3] > 0) {
        stack.push(bg);
        if (bg[3] === 1) break;
      }
      node = node.parentElement;
    }
    let result: [number, number, number] = [255, 255, 255];
    for (let i = stack.length - 1; i >= 0; i--) {
      result = blend(stack[i], result);
    }
    return result;
  }

  function relativeLuminance(rgb: [number, number, number]): number {
    const channels = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // ------------------------------------------------------------- element pool

  const allElements = Array.from(document.body.querySelectorAll("*")).filter(
    (el) => !isIgnored(el) && isVisible(el),
  );

  /**
   * If a modal is open, everything behind it is legitimately covered. In that state
   * we only audit occlusion inside the modal itself.
   */
  const openDialog = document.querySelector(
    '[role="dialog"]:not([aria-hidden="true"]), [aria-modal="true"]',
  );

  // ------------------------------------------------------- 1. occlusion check

  const occlusionCandidates = allElements.filter(
    (el) => (hasDirectText(el) || isInteractive(el)) && !isScreenReaderOnly(el),
  );

  for (const el of occlusionCandidates) {
    if (openDialog && !openDialog.contains(el)) continue;

    const rect = el.getBoundingClientRect();
    const samples: { x: number; y: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      for (let j = 1; j <= 3; j++) {
        samples.push({
          x: rect.left + (rect.width * i) / 4,
          y: rect.top + (rect.height * j) / 4,
        });
      }
    }

    let inViewport = 0;
    let occluded = 0;
    let blocker: Element | null = null;

    for (const point of samples) {
      if (
        point.x < 0 ||
        point.y < 0 ||
        point.x >= window.innerWidth ||
        point.y >= window.innerHeight
      ) {
        continue;
      }
      inViewport++;
      const hit = document.elementFromPoint(point.x, point.y);
      if (!hit) continue;
      // Self, descendants and ancestors are all expected hits.
      if (hit === el || el.contains(hit) || hit.contains(el)) continue;
      // Dev overlays and extension roots are not part of the product.
      if (isToolingArtifact(hit)) continue;
      // A label overlaying its own control is fine.
      if (hit.closest("label") && hit.closest("label")!.contains(el)) continue;
      // Content scrolling beneath a pinned header is intended, not a defect.
      if (opts.allowStickyOverlap && isPinned(hit)) continue;
      occluded++;
      blocker = hit;
    }

    if (inViewport === 0) continue;
    const ratio = occluded / inViewport;
    if (ratio > opts.occlusionThreshold && blocker) {
      violations.push({
        kind: "occlusion",
        severity: "error",
        selector: selectorFor(el),
        message: `Element is ${Math.round(ratio * 100)}% covered by an unrelated element (${selectorFor(blocker)}), making it unreadable or unclickable.`,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        detail: { blocker: selectorFor(blocker), occludedRatio: ratio },
      });
    }
  }

  // --------------------------------------------- 2. horizontal page overflow

  const docEl = document.documentElement;
  const scrollWidth = docEl.scrollWidth;
  const clientWidth = docEl.clientWidth;

  if (scrollWidth > clientWidth + TOLERANCE) {
    violations.push({
      kind: "horizontal-overflow",
      severity: "error",
      selector: "html",
      message: `Page scrolls horizontally: content is ${scrollWidth}px wide in a ${clientWidth}px viewport.`,
      detail: { scrollWidth, clientWidth, overflowBy: scrollWidth - clientWidth },
    });

    // 3. Pinpoint which elements actually extend past the right edge.
    for (const el of allElements) {
      if (isScreenReaderOnly(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) continue;
      if (rect.right > clientWidth + TOLERANCE || rect.left < -TOLERANCE) {
        violations.push({
          kind: "off-viewport",
          severity: "error",
          selector: selectorFor(el),
          message: `Element extends outside the viewport horizontally (left: ${Math.round(rect.left)}px, right: ${Math.round(rect.right)}px, viewport: ${clientWidth}px).`,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
    }
  }

  // ------------------------------------------------------- 4. text clipping

  for (const el of allElements) {
    if (!hasDirectText(el)) continue;
    const style = getComputedStyle(el);
    const hidesOverflow =
      style.overflow === "hidden" ||
      style.overflowX === "hidden" ||
      style.overflowY === "hidden";
    if (!hidesOverflow) continue;

    // Intentional truncation is not a defect.
    const truncatesDeliberately =
      style.textOverflow === "ellipsis" ||
      (style as unknown as { webkitLineClamp?: string }).webkitLineClamp !== undefined &&
        (style as unknown as { webkitLineClamp?: string }).webkitLineClamp !== "none";
    if (truncatesDeliberately) continue;

    const clippedVertically = el.scrollHeight > el.clientHeight + TOLERANCE;
    const clippedHorizontally = el.scrollWidth > el.clientWidth + TOLERANCE;
    if (!clippedVertically && !clippedHorizontally) continue;

    const rect = el.getBoundingClientRect();
    violations.push({
      kind: "text-clipping",
      severity: "error",
      selector: selectorFor(el),
      message: `Text is cut off with no ellipsis or line clamp (content ${el.scrollWidth}x${el.scrollHeight}, box ${el.clientWidth}x${el.clientHeight}).`,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      detail: {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      },
    });
  }

  // ---------------------------------------------------------- 5. contrast

  for (const el of allElements) {
    if (!hasDirectText(el)) continue;
    if (isScreenReaderOnly(el)) continue;

    const style = getComputedStyle(el);
    const fg = parseColor(style.color);
    if (!fg) continue;

    const bg = effectiveBackground(el);
    const composited = fg[3] < 1 ? blend(fg, bg) : ([fg[0], fg[1], fg[2]] as [number, number, number]);
    const ratio = contrastRatio(composited, bg);

    const fontSize = parseFloat(style.fontSize);
    const fontWeight = parseInt(style.fontWeight, 10) || 400;
    const isLarge = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    const required = isLarge ? opts.contrastLarge : opts.contrastNormal;

    if (ratio < required) {
      const rect = el.getBoundingClientRect();
      violations.push({
        kind: "low-contrast",
        severity: "error",
        selector: selectorFor(el),
        message: `Contrast ratio ${ratio.toFixed(2)}:1 is below the required ${required}:1 for ${isLarge ? "large" : "normal"} text.`,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        detail: {
          ratio: Number(ratio.toFixed(2)),
          required,
          color: style.color,
          background: `rgb(${bg.map((c) => Math.round(c)).join(", ")})`,
          fontSize,
          fontWeight,
        },
      });
    }
  }

  // ------------------------------------------------------- 6. tap targets

  if (opts.isMobile) {
    for (const el of allElements) {
      if (!isInteractive(el)) continue;
      if (isScreenReaderOnly(el)) continue;
      const rect = el.getBoundingClientRect();
      // Inline links inside a paragraph are exempt; the rule targets standalone controls.
      const insideProse = el.closest("p, li") !== null && el.tagName.toLowerCase() === "a";
      if (insideProse) continue;

      if (rect.width < opts.minTapTarget || rect.height < opts.minTapTarget) {
        violations.push({
          kind: "tap-target-too-small",
          severity: "warning",
          selector: selectorFor(el),
          message: `Interactive target is ${Math.round(rect.width)}x${Math.round(rect.height)}px, below the ${opts.minTapTarget}x${opts.minTapTarget}px minimum.`,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
    }
  }

  return {
    violations,
    stats: {
      elementsScanned: allElements.length,
      documentScrollWidth: scrollWidth,
      documentClientWidth: clientWidth,
    },
  };
}

/**
 * Runs the full audit against the current page state.
 */
export async function auditPage(
  page: Page,
  viewport: Viewport,
  overrides: Partial<AuditOptions> = {},
): Promise<AuditResult> {
  const options: AuditOptions = {
    ...DEFAULT_AUDIT_OPTIONS,
    isMobile: viewport.isMobile,
    ...overrides,
  };
  return page.evaluate(browserAudit, options);
}

/**
 * Formats violations into a report that is readable in test output.
 */
export function formatViolations(
  route: string,
  viewport: Viewport,
  result: AuditResult,
): string {
  const errors = result.violations.filter((v) => v.severity === "error");
  const warnings = result.violations.filter((v) => v.severity === "warning");

  const lines: string[] = [
    "",
    `Layout audit failed for ${route} at ${viewport.name} (${viewport.width}x${viewport.height})`,
    `  ${errors.length} error(s), ${warnings.length} warning(s), ${result.stats.elementsScanned} elements scanned`,
    "",
  ];

  const grouped = new Map<string, Violation[]>();
  for (const violation of result.violations) {
    const bucket = grouped.get(violation.kind) ?? [];
    bucket.push(violation);
    grouped.set(violation.kind, bucket);
  }

  for (const [kind, items] of grouped) {
    lines.push(`  [${kind}] ${items.length} occurrence(s)`);
    for (const item of items.slice(0, 10)) {
      lines.push(`    - ${item.selector}`);
      lines.push(`      ${item.message}`);
    }
    if (items.length > 10) {
      lines.push(`    ... and ${items.length - 10} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
