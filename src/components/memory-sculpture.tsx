"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

const BLOCKS = [
  { value: "A", slot: 0, color: "#b9a1ff", side: "#75609e" },
  { value: "B", slot: 2, color: "#ff784f", side: "#b84f33" },
  { value: "C", slot: 4, color: "#a9e8cb", side: "#5c9d84" },
  { value: "D", slot: 7, color: "#b9a1ff", side: "#75609e" },
  { value: "E", slot: 9, color: "#ff784f", side: "#b84f33" },
  { value: "F", slot: 11, color: "#a9e8cb", side: "#5c9d84" },
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
    <figure className="memory-exhibit min-w-0" aria-label="Interactive memory compaction model">
      <svg viewBox="0 0 600 450" role="img" aria-label={compacted ? "Six blocks in adjacent slots, followed by six empty slots." : "Six memory blocks scattered across twelve slots."} className="w-full overflow-visible">
        <circle cx="310" cy="239" r="204" fill="#393044" />
        <g fill="#51465f">
          {Array.from({ length: 12 }, (_, slot) => {
            const { x, y } = position(slot);
            return <path key={slot} d={`M${x} ${y + 12}l55 31-55 31-55-31Z`} />;
          })}
        </g>
        {BLOCKS.map((block, index) => {
          const slot = compacted ? index : block.slot;
          const { x, y } = position(slot);
          return (
            <g key={block.value} data-memory-block={block.value} data-slot={slot} style={{ transform: `translate(${x}px, ${y}px)` }} className="transition-transform duration-600 ease-in-out motion-reduce:transition-none">
              <path d="M-66 1 0 38 66 1v36L0 74-66 37Z" fill={block.side} />
              <path d="M0 38v36L-66 37V1Z" fill="#172730" opacity=".14" />
              <path d="M0-36 66 1 0 38-66 1Z" fill={block.color} />
              <path d="m-54 1 54 30 54-30" fill="none" stroke="#fff" strokeOpacity=".28" />
              <text x="0" y="8" textAnchor="middle" fill="#282334" className="font-mono text-[21px] font-semibold" transform="matrix(1,.56,-1,.56,0,0)">{block.value}</text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mx-auto flex max-w-md flex-col items-start gap-3 px-3 sm:flex-row sm:items-center sm:gap-5">
        <button type="button" onClick={() => setCompacted(!compacted)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#b9a1ff] bg-transparent px-5 text-sm font-semibold text-[#e4dafa] transition-colors hover:bg-white/10" aria-pressed={compacted}>
          {compacted && <RotateCcw className="size-3.5" aria-hidden="true" />}
          {compacted ? "Scatter again" : "Compact the memory"}
        </button>
        <p aria-live="polite" className="text-sm leading-relaxed text-[#c8bfd2]">
          {compacted ? "Same data. Same order. Room to grow." : "Six blocks. A few gaps. Can we make room?"}
        </p>
      </figcaption>
    </figure>
  );
}
