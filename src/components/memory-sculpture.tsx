"use client";

import { useId, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowUpRight, Layers2, RotateCcw } from "lucide-react";

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
  const [separation, setSeparation] = useState(30);
  const [selected, setSelected] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const controlId = useId();
  const inspected = hovered ?? selected;
  const activeBlock = BLOCKS[inspected];
  const activeSlot = compacted ? inspected : activeBlock.slot;
  const lift = separation * .72;

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
    event.currentTarget.style.setProperty("--view-x", `${x * 5}deg`);
    event.currentTarget.style.setProperty("--view-y", `${-y * 4}deg`);
  }

  return (
    <figure className="memory-exhibit min-w-0" aria-label="Interactive memory compaction model" data-separation={separation}>
      <div className="memory-stage" onPointerMove={tilt} onPointerLeave={(event) => {
        event.currentTarget.style.setProperty("--view-x", "0deg");
        event.currentTarget.style.setProperty("--view-y", "0deg");
        setHovered(null);
      }}>
      <svg viewBox="0 0 600 500" role="group" aria-label="Six data blocks above twelve memory addresses. Select a block to inspect it." className="memory-world w-full overflow-visible">
        <ellipse cx="310" cy="285" rx="235" ry="171" fill="#332c40" />
        <g className="memory-arrival" style={{ "--arrival-delay": "0ms" } as CSSProperties}>
        <path d="m245 100 313 176-236 132L9 232Z" fill="#44394f" />
        <path d="m9 232 313 176 236-132v13L322 423 9 245Z" fill="#211d2c" />
        <g fill="#63516f">
          {Array.from({ length: 12 }, (_, slot) => {
            const { x, y } = position(slot);
            return <path key={slot} d={`M${x} ${y + 12}l55 31-55 31-55-31Z`} fill={slot === activeSlot ? "#a389c3" : undefined} />;
          })}
        </g>
        <text x="310" y="443" fill="#cbbbdc" textAnchor="middle" className="font-mono text-[12px]">12 addresses / 6 occupied</text>
        </g>
        {BLOCKS.map((block, index) => {
          const slot = compacted ? index : block.slot;
          const { x, y } = position(slot);
          const isActive = inspected === index;
          return (
            <g key={block.value}>
              <path d={`M${x} ${y + 38}v${-lift - (isActive ? 18 : 0)}`} stroke={block.color} strokeWidth="1" opacity={separation > 10 ? ".45" : "0"} />
            <g data-memory-block={block.value} data-slot={slot} style={{ transform: `translate(${x}px, ${y - lift - (isActive ? 18 : 0)}px)` }} className="memory-block transition-transform duration-600 ease-in-out motion-reduce:transition-none" role="button" tabIndex={0} aria-label={`Inspect block ${block.value}, address ${slot}`} aria-pressed={selected === index}
              onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(null)}
              onFocus={() => setSelected(index)} onClick={() => setSelected(index)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(index); } }}>
              <g className="memory-arrival" style={{ "--arrival-delay": `${100 + index * 75}ms` } as CSSProperties}>
              <path d="M-66 1 0 38 66 1v36L0 74-66 37Z" fill={block.side} />
              <path d="M0 38v36L-66 37V1Z" fill="#172730" opacity=".14" />
              <path className="memory-block-top" d="M0-36 66 1 0 38-66 1Z" fill={block.color} stroke={isActive ? "#f2f0ed" : "transparent"} strokeWidth="2" />
              <path d="m-54 1 54 30 54-30" fill="none" stroke="#fff" strokeOpacity=".28" />
              <text x="0" y="8" textAnchor="middle" fill="#282334" className="font-mono text-[21px] font-semibold" transform="matrix(1,.56,-1,.56,0,0)">{block.value}</text>
              </g>
            </g>
            </g>
          );
        })}
        <g aria-hidden="true" className="memory-inspection-note">
          <path d="M437 94h64v37" fill="none" stroke="#b9a1ff" strokeWidth="1.5" />
          <text x="436" y="79" fill="#e4dafa" className="font-mono text-[13px]">Go ahead. Poke it.</text>
        </g>
      </svg>
      </div>
      <figcaption className="memory-controls">
        <div className="memory-inspector">
          <span className="memory-inspector-letter" style={{ background: activeBlock.color }}>{activeBlock.value}</span>
          <div><p className="font-mono text-sm text-[#f2f0ed]">Block {activeBlock.value} <ArrowUpRight className="inline size-3.5" aria-hidden="true" /> 0x{activeSlot.toString(16).padStart(2, "0").toUpperCase()}</p>
            <p className="mt-1 text-sm text-[#c8bfd2]">{compacted && activeBlock.slot !== activeSlot ? `Moved from address ${activeBlock.slot}. The data is unchanged.` : "An address tells you where. Not what."}</p></div>
        </div>
        <div className="memory-explode-control">
          <label htmlFor={controlId} className="flex items-center gap-2 text-sm text-[#e4dafa]"><Layers2 className="size-4" aria-hidden="true" /> Pull apart</label>
          <input id={controlId} type="range" min="0" max="100" value={separation} aria-valuetext={`${separation}% layer separation`} onChange={(event) => setSeparation(Number(event.target.value))} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => { setHovered(null); setCompacted(!compacted); }} className="memory-compact-button" aria-pressed={compacted}>
          {compacted && <RotateCcw className="size-3.5" aria-hidden="true" />}
          {compacted ? "Scatter again" : "Compact the memory"}
        </button>
        <p aria-live="polite" className="max-w-[23ch] text-sm leading-relaxed text-[#c8bfd2]">
          {compacted ? "Same data. Same order. Room to grow." : "Six blocks. A few gaps. Can we make room?"}
        </p>
        </div>
      </figcaption>
    </figure>
  );
}
