"use client";

import { cn } from "@/lib/utils";

import { Replay, useVisibleStory } from "./story-illustrations";

function StoryFooter({ copy, finished, reducedMotion, replay }: {
  copy: string;
  finished: boolean;
  reducedMotion: boolean;
  replay: () => void;
}) {
  return (
    <div className="mt-4 flex min-h-10 items-start justify-between gap-3 border-t border-current/25 pt-3">
      <p className="text-[13px] leading-snug font-medium">{copy}</p>
      {finished && !reducedMotion && <Replay onClick={replay} />}
    </div>
  );
}

const CHUNK_STEPS = [
  "ReadAt(5, 2) asks for bytes C and D.",
  "The index points to block 1. Block 0 is not read.",
  "Verify and decode block 1, then return CD.",
] as const;

export function ChunkReadStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1250);
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#c6eff1] p-5 text-[#282334]">
      <div role="img" aria-label="Blob AAAABCDE has two four-byte blocks. ReadAt offset 5 length 2 selects C and D in block 1, BCDE. Only block 1 is verified and decoded; block 0, AAAA, is not read.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Read only what you need.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">ReadAt(5, 2)</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-2" aria-hidden="true">
          {[
            { name: "BLOCK 0", bytes: "AAAA", touched: false },
            { name: "BLOCK 1", bytes: "BCDE", touched: true },
          ].map((block) => (
            <div key={block.name} className={cn("min-w-0 rounded-[12px] border-2 p-2.5", block.touched && stage >= 1 ? "border-[#2141b4] bg-white" : "border-[#282334]/20 bg-white/45")}>
              <div className="flex items-center justify-between gap-1 font-mono text-[9px] font-bold">
                <span>{block.name}</span><span>{block.touched && stage >= 1 ? "SELECTED" : "NO READ"}</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-0.5">
                {block.bytes.split("").map((byte, index) => (
                  <span key={index} className={cn("flex h-10 items-center justify-center rounded-[4px] font-mono text-[15px] font-bold sm:text-[19px]", block.touched && stage >= 2 && (index === 1 || index === 2) ? "bg-[#ff784f]" : "bg-[#282334]/10")}>{byte}</span>
                ))}
              </div>
              <div className="mt-3 font-mono text-[9px] font-semibold">{block.touched && stage >= 2 ? "CRC verified · CD copied" : block.touched ? "frame + CRC" : "untouched"}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-bold">
          <span>logical bytes 0–7</span><span>{stage === 2 ? "result: CD" : "one indexed frame"}</span>
        </div>
      </div>
      <StoryFooter copy={CHUNK_STEPS[stage]} finished={stage === 2} reducedMotion={reducedMotion} replay={replay} />
    </div>
  );
}

const SCHEDULER_STEPS = [
  "A takes the only worker at tick 0.",
  "C arrives at tick 1, but cannot interrupt A.",
  "A finishes at tick 6. The next choice happens now.",
] as const;

export function SchedulerStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1400);
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#e9d8e5] p-5 text-[#282334]">
      <div role="img" aria-label="One non-preemptive worker runs A from tick 0 to tick 6. C arrives at tick 1 and waits; it cannot interrupt A. At the idle boundary at tick 6, the scheduler can choose a waiting job. The illustrated schedule then runs B from 6 to 8 and C from 8 to 11.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Arrival isn’t interruption.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">1 worker</span>
        </div>
        <div className="mt-7 rounded-[12px] bg-[#282334] p-3 text-white" aria-hidden="true">
          <div className="mb-2 font-mono text-[10px] font-bold">WORKER / TICK</div>
          <div className="flex h-16 gap-0.5">
            <div className="flex w-[54.5%] items-center justify-center rounded-l-[6px] bg-[#ff784f] font-mono text-[22px] font-bold text-[#282334]">A</div>
            <div className={cn("flex w-[18.2%] items-center justify-center bg-[#53d9ff] font-mono text-lg font-bold text-[#282334]", stage < 2 && "opacity-30")}>B</div>
            <div className={cn("flex w-[27.3%] items-center justify-center rounded-r-[6px] bg-[#b9a1ff] font-mono text-lg font-bold text-[#282334]", stage < 2 && "opacity-30")}>C</div>
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px]"><span>0</span><span>6</span><span>8</span><span>11</span></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[10px] font-bold" aria-hidden="true">
          <span className="rounded-full bg-[#ff784f] px-2.5 py-1">A running</span>
          {stage >= 1 && <span className="rounded-full bg-white px-2.5 py-1">C arrives @ 1 · waits</span>}
          {stage >= 2 && <span className="rounded-full bg-[#b7ff45] px-2.5 py-1">next dispatch @ 6</span>}
        </div>
      </div>
      <StoryFooter copy={SCHEDULER_STEPS[stage]} finished={stage === 2} reducedMotion={reducedMotion} replay={replay} />
    </div>
  );
}

const QUEUE_STEPS = [
  "A and B are ready; both occupy capacity.",
  "Lease A. It is still resident while B waits.",
  "Nack A. Its old token is stale; B is now next.",
] as const;

export function QueueLeaseStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1350);
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#c5eed8] p-5 text-[#282334]">
      <div role="img" aria-label="The ready queue begins A then B. Leasing A leaves B ready while A remains resident and consumes capacity. Nacking A invalidates its old token and returns A to the back, making the ready order B then A. The next lease returns B.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Returned means last.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">FIFO by availability</span>
        </div>
        <div className="mt-7 space-y-2 font-mono" aria-hidden="true">
          <div className="rounded-[11px] border-2 border-[#282334]/30 bg-white/75 p-3">
            <div className="mb-2 text-[10px] font-bold">READY / NEXT →</div>
            <div className="flex gap-2">
              {(stage === 0 ? ["A", "B"] : stage === 1 ? ["B"] : ["B", "A"]).map((job, index) => (
                <span key={job} className={cn("flex h-12 w-12 items-center justify-center rounded-[7px] text-xl font-bold", index === 0 ? "bg-[#53d9ff]" : "bg-[#b9a1ff]")}>{job}</span>
              ))}
              {stage === 1 && <span className="self-center text-[10px] font-semibold">A is with worker</span>}
            </div>
          </div>
          <div className="flex min-h-16 items-center justify-between gap-2 rounded-[11px] bg-[#282334] p-3 text-white">
            <span className="text-[10px] font-bold">WORKER</span>
            <span className={cn("rounded-[7px] px-3 py-2 text-[12px] font-bold", stage === 1 ? "bg-[#ff784f] text-[#282334]" : "bg-white/15")}>{stage === 1 ? "A · lease to 10" : stage === 2 ? "A returned" : "idle"}</span>
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-bold">
          <span>resident: A + B</span><span>{stage === 2 ? "old A token: stale" : "capacity held"}</span>
        </div>
      </div>
      <StoryFooter copy={QUEUE_STEPS[stage]} finished={stage === 2} reducedMotion={reducedMotion} replay={replay} />
    </div>
  );
}

const GATE_STEPS = [
  "At tick 0, the burst budget contains four tokens.",
  "Cost 3 is allowed; one token remains.",
  "Another cost 3 is rejected. Earliest retry is tick 3.",
  "At tick 3, two tokens have accrued. Three are available.",
  "The retry spends all three. Zero remain.",
] as const;

export function TokenGateStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(4, 1150);
  const tokens = [4, 1, 1, 3, 0][stage];
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#ffe8a8] p-5 text-[#282334]">
      <div role="img" aria-label="A token bucket has burst four and refills two tokens per three ticks. At tick zero, a cost-three request leaves one token. Another cost-three request is rejected, with earliest RetryAt tick three. At tick three, lazy refill adds two tokens, so the retry is admitted and leaves zero.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Wait for the exact tick.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">2 tokens / 3 ticks</span>
        </div>
        <div className="mt-7 rounded-[12px] bg-[#2141b4] p-4 text-white" aria-hidden="true">
          <div className="flex justify-between font-mono text-[10px] font-bold"><span>BURST / 4</span><span>tick {stage >= 3 ? "3" : "0"}</span></div>
          <div className="mt-5 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn("h-14 rounded-[7px]", i < tokens ? "bg-[#b7ff45]" : "border-2 border-white/35 bg-white/10")} />
            ))}
          </div>
          <div className="mt-4 font-mono text-[13px] font-bold">
            {stage === 0 ? "4 available" : stage === 1 ? "3 spent · 1 available" : stage === 2 ? "3 needed · retry @ 3" : stage === 3 ? "+2 accrued · 3 available" : "3 spent · 0 left"}
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-bold">
          <span>cost 3</span><span>{stage === 2 ? "DENIED" : stage === 4 ? "ALLOWED" : "lazy refill"}</span>
        </div>
      </div>
      <StoryFooter copy={GATE_STEPS[stage]} finished={stage === 4} reducedMotion={reducedMotion} replay={replay} />
    </div>
  );
}
