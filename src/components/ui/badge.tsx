import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  "neutral" | "accent" | "signal" | "warning" | "danger";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-white/5 text-muted border-white/10",
  accent: "bg-accent-tint text-link border-accent/25",
  signal: "bg-signal/10 text-signal border-signal/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "text-micro font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

/** The three rungs of a ladder. Mirrors the Difficulty enum in the schema. */
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; variant: BadgeVariant }
> = {
  EASY: { label: "Easy", variant: "signal" },
  MEDIUM: { label: "Medium", variant: "warning" },
  HARD: { label: "Hard", variant: "danger" },
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const { label, variant } = DIFFICULTY_META[difficulty];
  // Colour alone must not carry the meaning, so the tier is also named for
  // screen readers and remains legible to colour-blind users via the text.
  return (
    <Badge
      variant={variant}
      className={className}
      aria-label={`Difficulty: ${label}`}
    >
      {label}
    </Badge>
  );
}
