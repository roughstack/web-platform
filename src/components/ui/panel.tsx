"use client";

import { cn } from "@/lib/utils";

/**
 * The workspace primitives: a framed region, a header strip, a tab bar, an icon
 * button and a segmented control.
 *
 * These are the pieces the arena is assembled from. Keeping them here rather
 * than inline in the arena is what makes the next workspace — a diff viewer, a
 * replay scrubber — an arrangement of existing parts instead of another
 * bespoke page.
 */

// ------------------------------------------------------------------- panel

export interface PanelProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

/** A framed region that fills its slot and scrolls its own content. */
export function Panel({ children, className }: PanelProps) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col bg-canvas", className)}>
      {children}
    </section>
  );
}

/** A fixed strip at the top of a panel. Never scrolls with the content. */
export function PanelHeader({ children, className }: PanelProps) {
  return (
    <header
      className={cn(
        "flex h-9 shrink-0 items-center gap-1 border-b border-edge bg-canvas px-2",
        className,
      )}
    >
      {children}
    </header>
  );
}

/** The scrolling region beneath a panel header. */
export function PanelBody({ children, className }: PanelProps) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", className)}>{children}</div>;
}

// -------------------------------------------------------------------- tabs

export interface TabItem<T extends string> {
  readonly id: T;
  readonly label: string;
  /** Small count or status shown after the label. */
  readonly badge?: string | number;
  readonly icon?: React.ReactNode;
}

export interface TabsProps<T extends string> {
  readonly tabs: readonly TabItem<T>[];
  readonly active: T;
  readonly onChange: (id: T) => void;
  readonly className?: string;
  readonly label: string;
}

/**
 * A tab bar with roving focus, so arrow keys move between tabs and only the
 * active one is a tab stop. That is the expected behaviour for a tablist and
 * costs almost nothing to honour.
 */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
  label,
}: TabsProps<T>) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    if (index < 0) return;

    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;

    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={cn("flex gap-0.5", className)}>
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              // Touch first, then tighten. A 28px control is comfortable with
              // a mouse and misses with a thumb, so the compact size is the
              // exception granted to pointer-sized viewports.
              "inline-flex h-11 items-center gap-1.5 rounded-6 px-2.5 text-mini transition-colors lg:h-7",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
              selected
                ? "bg-white/[0.07] font-medium text-ink"
                : "text-quiet hover:bg-white/[0.04] hover:text-body",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 font-mono text-micro tabular-nums",
                  selected ? "bg-white/10 text-muted" : "text-quiet",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------- icon button

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon alone tells a screen reader nothing. */
  readonly label: string;
  readonly active?: boolean;
}

export function IconButton({ label, active, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-6 transition-colors lg:size-7",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        active
          ? "bg-white/[0.09] text-ink"
          : "text-quiet hover:bg-white/[0.06] hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------ segmented

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedProps<T extends string> {
  readonly options: readonly SegmentedOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
  readonly className?: string;
}

/** A compact exclusive choice, for two or three short options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex rounded-6 border border-edge bg-tint p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-11 min-w-11 items-center justify-center rounded-4 px-3 text-micro transition-colors lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
              selected ? "bg-white/[0.09] font-medium text-ink" : "text-quiet hover:text-body",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
