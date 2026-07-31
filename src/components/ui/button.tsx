import { Children, cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-signal text-canvas font-semibold hover:bg-signal/90 active:bg-signal/80",
  secondary:
    "bg-elevated text-ink border border-edge-strong hover:bg-edge hover:border-ink-muted",
  ghost: "text-ink-secondary hover:bg-elevated hover:text-ink",
  danger: "bg-danger text-canvas font-semibold hover:bg-danger/90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // 36px. Reserved for dense desktop toolbars; below the 44px mobile tap target.
  sm: "h-9 px-3 text-sm gap-1.5",
  // 44px, the minimum comfortable touch target.
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables interaction and announces the busy state. */
  loading?: boolean;
  /**
   * Renders the single child element with the button's styling instead of a
   * `button` tag. Use for links that should look like buttons, so the correct
   * semantic element is emitted rather than a button that navigates.
   */
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg",
    "transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if (asChild) {
    const child = Children.only(children) as ReactElement<{ className?: string }>;
    if (!isValidElement(child)) {
      throw new Error("Button with asChild requires a single React element child.");
    }
    return cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
