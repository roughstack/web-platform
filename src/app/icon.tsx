import { ImageResponse } from "next/og";

import { BrandMark } from "@/components/brand-mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Keep the browser icon and the navigation symbol sourced from one component.
export default function Icon() {
  return new ImageResponse(<BrandMark size={64} />, size);
}
