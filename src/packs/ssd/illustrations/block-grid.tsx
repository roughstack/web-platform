import { cn } from "@/lib/utils";

/**
 * The device as blocks of pages.
 *
 * Used in the problem statement to show why space can only be reclaimed a whole
 * block at a time, and in the results panel to show the state a solution left
 * the device in. Same component, so the second reading is free.
 */

export interface BlockOccupancy {
  readonly index: number;
  readonly valid: number;
  readonly invalid: number;
  readonly free: number;
  readonly eraseCount: number;
  readonly isOverProvision: boolean;
}

export interface BlockGridProps {
  readonly blocks: readonly BlockOccupancy[];
  readonly pagesPerBlock: number;
  /** Block indices to call out, for example the one just reclaimed. */
  readonly highlight?: readonly number[];
  /** Hides the legend, for use inside a dense results panel. */
  readonly hideLegend?: boolean;
  readonly className?: string;
}

export function BlockGrid({
  blocks,
  pagesPerBlock,
  highlight,
  hideLegend,
  className,
}: BlockGridProps) {
  const marked = new Set(highlight ?? []);

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(2.75rem, 1fr))" }}
        role="img"
        aria-label={describe(blocks)}
      >
        {blocks.map((block) => (
          <Block
            key={block.index}
            block={block}
            pagesPerBlock={pagesPerBlock}
            highlighted={marked.has(block.index)}
          />
        ))}
      </div>

      {!hideLegend && <Legend />}
    </div>
  );
}

function Block({
  block,
  pagesPerBlock,
  highlighted,
}: {
  block: BlockOccupancy;
  pagesPerBlock: number;
  highlighted: boolean;
}) {
  // Pages within a block have no meaningful order to a policy — only the counts
  // matter — so they are drawn grouped by state rather than in address order.
  const cells = [
    ...Array.from({ length: block.valid }, () => "valid" as const),
    ...Array.from({ length: block.invalid }, () => "invalid" as const),
    ...Array.from({ length: block.free }, () => "free" as const),
  ];

  const columns = Math.ceil(Math.sqrt(Math.max(pagesPerBlock, 1)));

  return (
    <div
      className={cn(
        "rounded-4 border p-1 transition-colors",
        block.isOverProvision ? "border-dashed border-edge/70" : "border-edge",
        highlighted && "ring-1 ring-accent",
      )}
      title={[
        `block ${block.index}`,
        `${block.valid} live`,
        `${block.invalid} dead`,
        `${block.free} free`,
        `erased ${block.eraseCount}x`,
        block.isOverProvision ? "over-provision" : null,
      ]
        .filter(Boolean)
        .join(" · ")}
    >
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cells.map((state, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[1px]",
              state === "valid" && "bg-accent/70",
              state === "invalid" && "bg-danger/45",
              state === "free" && "bg-white/[0.06]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Legend() {
  const entries = [
    { label: "live", className: "bg-accent/70" },
    { label: "dead", className: "bg-danger/45" },
    { label: "free", className: "bg-white/[0.06]" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-micro text-quiet">
      {entries.map((entry) => (
        <span key={entry.label} className="inline-flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-[1px]", entry.className)} />
          {entry.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-[1px] border border-dashed border-edge" />
        over-provision
      </span>
    </div>
  );
}

function describe(blocks: readonly BlockOccupancy[]): string {
  const live = blocks.reduce((sum, b) => sum + b.valid, 0);
  const dead = blocks.reduce((sum, b) => sum + b.invalid, 0);
  return `${blocks.length} blocks holding ${live} live pages and ${dead} dead pages.`;
}
