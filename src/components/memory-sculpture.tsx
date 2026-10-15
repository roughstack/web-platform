"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const BLOCKS = [
  { value: "A", slot: 0, color: "#2447e7", side: "#1933ac" },
  { value: "B", slot: 2, color: "#f27657", side: "#bd4b33" },
  { value: "C", slot: 4, color: "#2447e7", side: "#1933ac" },
  { value: "D", slot: 7, color: "#f4ce57", side: "#b88f24" },
  { value: "E", slot: 9, color: "#f27657", side: "#bd4b33" },
  { value: "F", slot: 11, color: "#2447e7", side: "#1933ac" },
];

function position(slot: number) {
  const column = slot % 4;
  const row = Math.floor(slot / 4);
  return { x: 245 + (column - row) * 77, y: 114 + (column + row) * 43 };
}

/** A conceptual stable-compaction model, not a challenge execution result. */
export function MemorySculpture() {
  const [compacted, setCompacted] = useState(false);
  return (
    <figure className="min-w-0" aria-label="Interactive memory compaction model">
      <svg viewBox="0 0 600 450" role="img" aria-label={compacted ? "Six blocks in adjacent slots, followed by six empty slots." : "Six memory blocks scattered across twelve slots."} className="w-full overflow-visible">
        <ellipse cx="310" cy="260" rx="255" ry="171" fill="#e4eafb" />
        <g fill="none" stroke="#9caacb" strokeWidth="1.5" strokeDasharray="4 5">
          {Array.from({ length: 12 }, (_, slot) => {
            const { x, y } = position(slot);
            return <path key={slot} d={`M${x} ${y}l66 37-66 37-66-37Z`} />;
          })}
        </g>
        {BLOCKS.map((block, index) => {
          const slot = compacted ? index : block.slot;
          const { x, y } = position(slot);
          return (
            <g key={block.value} data-memory-block={block.value} data-slot={slot} style={{ transform: `translate(${x}px, ${y}px)` }} className="transition-transform duration-600 ease-in-out motion-reduce:transition-none">
              <path d="M-66 1 0 38 66 1v36L0 74-66 37Z" fill={block.side} />
              <path d="M0 38v36L-66 37V1Z" fill="#172730" opacity=".14" />
              <path d="M0-36 66 1 0 38-66 1Z" fill={block.color} stroke="#f8fafc" strokeWidth="1.5" />
              <text x="0" y="8" textAnchor="middle" fill={block.color === "#2447e7" ? "#fff" : "#172730"} className="font-mono text-[21px] font-semibold" transform="matrix(1,.56,-1,.56,0,0)">{block.value}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mx-auto flex max-w-md flex-col items-start gap-3 px-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="button" onClick={() => setCompacted(!compacted)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#172730] bg-white px-5 text-sm font-semibold text-ink transition-colors hover:bg-[#e4eafb]" aria-pressed={compacted}>
          {compacted && <RotateCcw className="size-3.5" aria-hidden="true" />}
          {compacted ? "Scatter again" : "Compact the memory"}
        </button>
        <p aria-live="polite" className="text-sm leading-relaxed text-muted">
          {compacted ? "Same data. Same order. Room to grow." : "Six blocks. A few gaps. Can we make room?"}
        </p>
      </figcaption>
    </figure>
  );
}
