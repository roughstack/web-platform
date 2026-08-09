import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/*
 * Elevation in this system is lightness, not shadow. A surface reads as
 * "higher" because it is a step lighter than its floor and carries a hairline,
 * so these variants are ordered by brightness rather than by shadow depth.
 */
export type CardVariant = "tint" | "panel" | "glass";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  tint: "bg-tint border-edge",
  panel: "bg-panel border-edge",
  glass: "bg-white/[0.035] border-white/10",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Adds a hairline-brightening hover state. Use only when the card is a link. */
  interactive?: boolean;
}

export function Card({
  variant = "tint",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-12 border",
        VARIANT_CLASSES[variant],
        interactive &&
          "transition-colors duration-150 ease-out-quad hover:border-edge-bright hover:bg-raised",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The frame that wraps a screenshot, a grid visualisation or a code panel.
 * Larger radius and a darker floor than a card, so the contents read as the
 * artwork and the frame recedes.
 */
export function Frame({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-16 border border-edge bg-panel",
        className,
      )}
      {...props}
    />
  );
}
