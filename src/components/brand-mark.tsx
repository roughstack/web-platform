import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  size?: number;
}

/** A modular R: spine, open bowl, and a detached diagonal leg. */
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
      <rect width="64" height="64" rx="14" fill="#282334" />
      <path d="M12 12h11v40H12Z" fill="#ff784f" />
      <path d="M28 12h12a14 14 0 0 1 0 28H28V29h11a3 3 0 0 0 0-6H28Z" fill="#b9a1ff" />
      <path d="m29 43 12-3 13 12H39Z" fill="#a9e8cb" />
    </svg>
  );
}
