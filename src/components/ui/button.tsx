import {
  Children,
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  "primary" | "secondary" | "ghost" | "brand" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/*
 * The primary button is a white fill. It is the brightest thing on any page,
 * which is what rations it: one, at most two, per band. Everything else is
 * glass or bare text so that the eye has a single place to land.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-inverse text-canvas hover:bg-inverse/90 active:bg-inverse/80",
  secondary:
    "bg-white/5 text-ink border border-white/10 hover:bg-white/10 hover:border-white/15",
  ghost: "text-muted hover:bg-white/5 hover:text-ink",
  brand: "bg-brand text-white hover:bg-accent",
  danger: "bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20",
};

/*
 * Linear's control height is 36px, but that is a mouse-pointer geometry. The
 * ladder starts at the 44px touch minimum and only steps down at `lg`, since
 * tablets are touch devices too and 768px still needs the larger target.
 */
const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-11 gap-1.5 px-3 text-mini lg:h-8 lg:px-2.5",
  md: "h-11 gap-2 px-4 text-regular lg:h-9",
  lg: "h-12 gap-2 px-5 text-regular lg:h-11",
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
    "inline-flex items-center justify-center whitespace-nowrap rounded-8 font-medium",
    "transition-colors duration-100 ease-out-quad",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );

  if (asChild) {
    const child = Children.only(children) as ReactElement<{
      className?: string;
    }>;
    if (!isValidElement(child)) {
      throw new Error(
        "Button with asChild requires a single React element child.",
      );
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
      {loading && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
