import type { Page } from "@playwright/test";

/**
 * The outline colour used by x-ray mode. Pure magenta is chosen because it does not
 * occur anywhere in the ByteArena palette, so every pixel matching it in a screenshot
 * is guaranteed to be an element boundary rather than real content.
 */
export const XRAY_COLOR = { r: 255, g: 0, b: 255 };

const XRAY_STYLE_ID = "bytearena-xray";

/**
 * Paints a 1px boundary around every element in the page.
 *
 * `outline` is used rather than `border` on purpose: outlines are painted outside the
 * box without participating in layout, so switching x-ray on cannot itself shift
 * anything and manufacture the very overlaps we are looking for.
 */
export async function enableXray(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Freeze motion so screenshots are deterministic. */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      /* The x-ray boundary itself. */
      body * {
        outline: 1px solid rgb(${XRAY_COLOR.r}, ${XRAY_COLOR.g}, ${XRAY_COLOR.b}) !important;
        outline-offset: -1px !important;
      }
    `,
  });
  await page.evaluate((id) => {
    const tags = document.head.querySelectorAll("style");
    const last = tags[tags.length - 1];
    if (last) last.id = id;
  }, XRAY_STYLE_ID);
}

/** Removes the x-ray boundaries again so a clean screenshot can be taken. */
export async function disableXray(page: Page): Promise<void> {
  await page.evaluate((id) => {
    document.getElementById(id)?.remove();
  }, XRAY_STYLE_ID);
}

/** Suppresses animation without enabling boundaries, for stable normal screenshots. */
export async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}
