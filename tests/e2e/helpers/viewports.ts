import type { Viewport } from "./audit-types";

/**
 * Every route is certified against all of these before a phase is considered done.
 * Widths are chosen at real device breakpoints rather than round numbers so that
 * off-by-one media query bugs actually surface.
 */
export const VIEWPORTS: Viewport[] = [
  { name: "mobile-sm", width: 320, height: 568, isMobile: true },
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "tablet", width: 768, height: 1024, isMobile: true },
  { name: "laptop", width: 1280, height: 800, isMobile: false },
  { name: "desktop", width: 1920, height: 1080, isMobile: false },
];
