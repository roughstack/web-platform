import { cn } from "@/lib/utils";

/**
 * The two measurements the upper rungs are ranked on, drawn rather than
 * tabulated. Both appear in problem statements to explain what is being
 * measured, and again in results to show what a solution scored.
 */

// ------------------------------------------------------------ write amplification

export interface WriteAmpBarProps {
  /** Writes the workload actually asked for. */
  readonly hostWrites: number;
  /** Extra writes spent moving live data out of blocks before erasing them. */
  readonly gcWrites: number;
  /** Draws a marker at a reference value, such as a known-good solution. */
  readonly reference?: number;
  readonly className?: string;
}

export function WriteAmpBar({ hostWrites, gcWrites, reference, className }: WriteAmpBarProps) {
  const total = hostWrites + gcWrites;
  const amplification = hostWrites > 0 ? total / hostWrites : 1;
  const gcShare = total > 0 ? (gcWrites / total) * 100 : 0;

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-micro uppercase tracking-wide text-quiet">
          write amplification
        </span>
        <span className="font-mono text-title-6 tabular-nums text-ink">
          {amplification.toFixed(2)}
          <span className="text-mini text-quiet">×</span>
        </span>
      </div>

      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="img"
        aria-label={`${hostWrites} writes the workload asked for, plus ${gcWrites} spent moving data, an amplification of ${amplification.toFixed(2)} times.`}
      >
        <div className="absolute inset-y-0 left-0 bg-accent/70" style={{ width: `${100 - gcShare}%` }} />
        <div className="absolute inset-y-0 right-0 bg-warning/70" style={{ width: `${gcShare}%` }} />
      </div>

      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-quiet">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[1px] bg-accent/70" />
          {hostWrites.toLocaleString()} asked for
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-[1px] bg-warning/70" />
          {gcWrites.toLocaleString()} spent moving data
        </span>
        {reference !== undefined && (
          <span className="text-muted">reference {reference.toFixed(2)}×</span>
        )}
      </figcaption>
    </figure>
  );
}

// ------------------------------------------------------------------------ wear

export interface WearHistogramProps {
  /** Erase count per block, in block order. */
  readonly eraseCounts: readonly number[];
  readonly className?: string;
}

/**
 * Erase counts per block.
 *
 * The shape is the message: a flat profile means wear is spread and the device
 * lasts, while one tall bar means a block is being burned out long before the
 * rest and takes the whole device with it.
 */
export function WearHistogram({ eraseCounts, className }: WearHistogramProps) {
  if (eraseCounts.length === 0) return null;

  const max = Math.max(...eraseCounts, 1);
  const mean = eraseCounts.reduce((sum, n) => sum + n, 0) / eraseCounts.length;
  const spread = Math.sqrt(
    eraseCounts.reduce((sum, n) => sum + (n - mean) ** 2, 0) / eraseCounts.length,
  );

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-micro uppercase tracking-wide text-quiet">erases per block</span>
        <span className="font-mono text-mini tabular-nums text-muted">
          spread {spread.toFixed(2)} · peak {max}
        </span>
      </div>

      <div
        className="flex h-20 items-end gap-px"
        role="img"
        aria-label={`Erase counts across ${eraseCounts.length} blocks, peaking at ${max} with a spread of ${spread.toFixed(2)}.`}
      >
        {eraseCounts.map((count, index) => {
          // A block that is being worn far past the average is the failure this
          // chart exists to reveal, so it is coloured rather than left to be
          // spotted by eye.
          const hot = count > mean * 1.5 && count > 1;
          return (
            <span
              key={index}
              className={cn(
                "min-h-px flex-1 rounded-t-[1px] transition-colors",
                hot ? "bg-danger/70" : "bg-accent/55",
              )}
              style={{ height: `${Math.max((count / max) * 100, 1)}%` }}
              title={`block ${index}: erased ${count}x`}
            />
          );
        })}
      </div>

      {/* The mean line is the thing a good answer flattens towards. */}
      <figcaption className="text-micro text-quiet">
        mean {mean.toFixed(1)} · lower spread means the device lasts longer
      </figcaption>
    </figure>
  );
}

// -------------------------------------------------------------------- efficiency

export interface EfficiencyDialProps {
  /** Moves the solution used. */
  readonly moves: number;
  /** Fewest moves that could possibly work. */
  readonly optimal: number;
  readonly className?: string;
}

/**
 * How close a compaction answer came to the provable optimum.
 *
 * The easy rung is the one place on the platform with a right answer, so it is
 * shown as distance from that answer rather than as a rank.
 */
export function EfficiencyDial({ moves, optimal, className }: EfficiencyDialProps) {
  const perfect = moves === optimal;
  const wasted = Math.max(moves - optimal, 0);
  const ratio = moves > 0 ? Math.min(optimal / moves, 1) : 1;

  return (
    <figure className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-micro uppercase tracking-wide text-quiet">moves used</span>
        <span className="font-mono text-title-6 tabular-nums text-ink">
          {moves}
          <span className="text-mini text-quiet"> / {optimal} optimal</span>
        </span>
      </div>

      <div
        className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
        role="img"
        aria-label={
          perfect
            ? "Optimal: no move was wasted."
            : `${wasted} more moves than necessary.`
        }
      >
        <div
          className={cn("h-full transition-all", perfect ? "bg-signal/80" : "bg-accent/70")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>

      <figcaption className="text-micro text-quiet">
        {perfect
          ? "Optimal. Every move was necessary."
          : `${wasted} ${wasted === 1 ? "move was" : "moves were"} avoidable.`}
      </figcaption>
    </figure>
  );
}
