import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "signal" | "accent" | "warning" | "danger";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-elevated text-ink-secondary border-edge",
  signal: "bg-signal/10 text-signal border-signal/25",
  accent: "bg-accent/10 text-accent border-accent/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5",
        "font-mono text-xs tracking-wide",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  );
}

export type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

const DIFFICULTY_META: Record<Difficulty, { label: string; variant: BadgeVariant }> = {
  BEGINNER: { label: "Beginner", variant: "signal" },
  INTERMEDIATE: { label: "Intermediate", variant: "accent" },
  ADVANCED: { label: "Advanced", variant: "warning" },
  EXPERT: { label: "Expert", variant: "danger" },
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
    <Badge variant={variant} className={className} aria-label={`Difficulty: ${label}`}>
      {label}
    </Badge>
  );
}
