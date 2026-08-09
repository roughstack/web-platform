import { cn } from "@/lib/utils";

/**
 * A flat array of slots, live and dead.
 *
 * Used twice: in the compaction problem statement to show what fragmentation
 * looks like, and in the results panel to show the array a solution actually
 * produced. Reading it once teaches you to read it the second time.
 */

export const EMPTY_SLOT = -1;

export interface SlotStripProps {
  /** Each entry is the value living in that slot, or -1 for empty. */
  readonly slots: readonly number[];
  /**
   * Draws a boundary after this many slots, marking where live data is
   * supposed to end up. Omit to draw no boundary.
   */
  readonly prefix?: number;
  /** Slot indices to call out, for example the ones a move touched. */
  readonly highlight?: readonly number[];
  /** Hides the value inside each cell, for long arrays where it is noise. */
  readonly compact?: boolean;
  readonly className?: string;
}

export function SlotStrip({
  slots,
  prefix,
  highlight,
  compact,
  className,
}: SlotStripProps) {
  const marked = new Set(highlight ?? []);
  // Past a certain width the numbers stop being readable anyway, so the cells
  // shrink to bare state and the strip stays legible instead of wrapping into
  // an unreadable block.
  const dense = compact ?? slots.length > 48;

  return (
    <div
      className={cn("flex flex-wrap gap-1", className)}
      role="img"
      aria-label={describe(slots, prefix)}
    >
      {slots.map((value, index) => {
        const live = value !== EMPTY_SLOT;
        const boundary = prefix !== undefined && index === prefix && index > 0;

        return (
          <div
            key={index}
            className={cn(
              "relative flex items-center justify-center rounded-4 border font-mono tabular-nums transition-colors",
              dense ? "h-4 w-4 text-[0px]" : "h-7 min-w-7 px-1 text-micro",
              live
                ? "border-accent/40 bg-accent/15 text-ink"
                : "border-edge bg-transparent text-quiet",
              marked.has(index) && "ring-1 ring-accent ring-offset-1 ring-offset-canvas",
              // The boundary is drawn as a left edge on the first slot past the
              // prefix, so it sits between cells rather than consuming a column.
              boundary && "ml-2 before:absolute before:-left-[5px] before:top-[-2px] before:h-[calc(100%+4px)] before:w-px before:bg-accent/60",
            )}
            title={live ? `slot ${index}: value ${value}` : `slot ${index}: empty`}
          >
            {!dense && (live ? value : "")}
            {!live && !dense && <DeadSlotMark />}
          </div>
        );
      })}
    </div>
  );
}

/** A faint diagonal, so an empty slot reads as empty rather than as unstyled. */
function DeadSlotMark() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-4 opacity-40"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 3px, var(--color-edge) 3px, var(--color-edge) 4px)",
      }}
    />
  );
}

function describe(slots: readonly number[], prefix?: number): string {
  const live = slots.filter((v) => v !== EMPTY_SLOT).length;
  const base = `An array of ${slots.length} slots, ${live} of them holding live data`;
  return prefix === undefined ? `${base}.` : `${base}, which should end up in the first ${prefix}.`;
}
