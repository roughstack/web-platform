import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Small muted line that sits above a headline. The accent dot is the entire
 * colour budget for most bands, so a band with an eyebrow rarely needs any
 * other accent.
 */
export function Eyebrow({
  children,
  dot = true,
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { dot?: boolean }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-micro font-medium text-muted",
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-accent"
        />
      )}
      {children}
    </p>
  );
}

/**
 * Numbered caption for a diagram, e.g. `FIG 1.2`. Linear labels its marketing
 * illustrations this way; on a systems-engineering product it reads as
 * documentation rather than advertising, which is the intended tone.
 */
export function FigureLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "font-mono text-micro tracking-widest text-quiet uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/** A keyboard key. Use whenever a shortcut appears in running copy. */
export function Kbd({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-4 px-1.5",
        "border-t border-white/15 bg-raised font-mono text-tiny text-body",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
