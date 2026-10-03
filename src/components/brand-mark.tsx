import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
}

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path
        d="M6 7.25h10.5M7.5 12h10.5M5.5 16.75H16"
        fill="none"
        stroke="#0b0b0b"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
