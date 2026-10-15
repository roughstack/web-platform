import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: number;
}

/** One routed signal across three layers, ending in an active node. */
export function BrandMark({ className, size = 28 }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="17" fill="#2447e7" />
      <path
        d="M18 17h27v15H20v15h26"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="17" r="5.5" fill="#e6fa69" />
      <circle cx="46" cy="47" r="6.5" fill="#ff784f" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}
