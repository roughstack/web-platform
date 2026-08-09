import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
 * tailwind-merge only knows Tailwind's stock scales. Our theme replaces them
 * wholesale, so without this it cannot tell a colour from a font size and
 * treats `text-canvas` and `text-regular` as the same conflict group — the
 * first one silently disappears. That failure is invisible in review and
 * produced white-on-white buttons, so these lists must stay in step with the
 * `@theme` block in globals.css.
 */
const TEXT_SIZES = [
  "tiny",
  "micro",
  "mini",
  "small",
  "regular",
  "large",
  "title-1",
  "title-2",
  "title-3",
  "title-4",
  "title-5",
  "title-6",
  "title-7",
  "title-8",
];

const COLORS = [
  "canvas",
  "canvas-deep",
  "panel",
  "tint",
  "surface",
  "raised",
  "raised-high",
  "frame",
  "edge",
  "edge-strong",
  "edge-bright",
  "ink",
  "body",
  "muted",
  "quiet",
  "accent",
  "accent-hover",
  "link",
  "accent-tint",
  "brand",
  "signal",
  "danger",
  "warning",
  "inverse",
  "tier-1",
  "tier-2",
  "tier-3",
  "tier-4",
];

const RADII = ["4", "6", "8", "12", "16", "24", "32"];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: TEXT_SIZES,
      color: COLORS,
      radius: RADII,
    },
  },
});

/**
 * Joins class names and resolves conflicting Tailwind utilities so that a class
 * passed by a caller reliably beats the component's own default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
