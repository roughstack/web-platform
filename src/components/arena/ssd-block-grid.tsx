"use client";

import { cn } from "@/lib/utils";

export interface BlockState {
  index: number;
  valid: number;
  invalid: number;
  free: number;
  eraseCount: number;
  isOverProvision: boolean;
}

export interface SsdBlockGridProps {
  blocks: BlockState[];
  pagesPerBlock: number;
}

/**
 * SsdBlockGrid renders the final state of the simulated flash device as a
 * grid of blocks, each showing the proportion of valid (green), invalid
 * (amber), and free (dark) pages within it. The erase count is shown as a
 * small badge on each block; over-provision blocks are dimmed.
 *
 * This is the visual payoff of the challenge: a user can see at a glance
 * whether their policy left the device tidy (mostly free + valid, little
 * invalid) or messy (lots of invalid pages waiting to be reclaimed), and
 * whether wear was levelled (even erase counts) or concentrated (a few
 * hot blocks with high counts).
 */
export function SsdBlockGrid({ blocks, pagesPerBlock }: SsdBlockGridProps) {
  if (!blocks.length) return null;

  const maxErase = Math.max(...blocks.map((b) => b.eraseCount), 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-medium text-ink">Device state after run</h4>
        <div className="flex items-center gap-3 text-[10px] text-ink-muted">
          <LegendDot color="bg-signal" label="Valid" />
          <LegendDot color="bg-warning" label="Invalid" />
          <LegendDot color="bg-edge" label="Free" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {blocks.map((block) => {
          const total = block.valid + block.invalid + block.free;
          const validPct = (block.valid / total) * 100;
          const invalidPct = (block.invalid / total) * 100;
          const freePct = (block.free / total) * 100;
          const wearIntensity = block.eraseCount / maxErase;

          return (
            <div
              key={block.index}
              className={cn(
                "group relative overflow-hidden rounded border border-edge bg-canvas",
                block.isOverProvision && "opacity-50",
              )}
              title={`Block ${block.index}: ${block.valid} valid, ${block.invalid} invalid, ${block.free} free, ${block.eraseCount} erases${
                block.isOverProvision ? " (over-provision)" : ""
              }`}
            >
              {/* Stacked bar showing page composition */}
              <div className="flex h-8 w-full">
                <div
                  className="bg-signal/70"
                  style={{ width: `${validPct}%` }}
                />
                <div
                  className="bg-warning/70"
                  style={{ width: `${invalidPct}%` }}
                />
                <div
                  className="bg-edge/40"
                  style={{ width: `${freePct}%` }}
                />
              </div>

              {/* Wear indicator: a thin bar at the bottom whose opacity
                  scales with the erase count relative to the max. */}
              <div
                className="h-0.5 w-full bg-danger"
                style={{ opacity: 0.2 + wearIntensity * 0.8 }}
              />

              {/* Erase count badge */}
              <div className="absolute right-0.5 top-0.5 font-mono text-[8px] text-ink-muted">
                {block.eraseCount}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink-muted">
        <span>
          {blocks.length} blocks · {pagesPerBlock} pages/block ·{" "}
          {blocks.length * pagesPerBlock} total pages
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-3 bg-danger" />
          wear intensity
        </span>
        <span className="opacity-50">■ over-provision blocks</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block h-2 w-2 rounded-sm", color)} />
      {label}
    </span>
  );
}
