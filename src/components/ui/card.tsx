import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* White cards lift gently from the paper floor; tinted cards organize detail. */
export type CardVariant = "tint" | "panel" | "glass";

const VARIANT_CLASSES: Record<CardVariant, string> = {
  tint: "bg-panel border-edge",
  panel: "bg-panel border-edge",
  glass: "bg-accent-tint border-accent/20",
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
          "transition-colors duration-150 ease-out-quad hover:border-accent/40 hover:bg-accent-tint",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The frame that wraps a screenshot, a grid visualisation or a code panel.
 * A restrained white frame keeps diagrams and code examples in focus.
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
