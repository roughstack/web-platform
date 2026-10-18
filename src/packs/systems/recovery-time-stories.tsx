"use client";

import { cn } from "@/lib/utils";

import { Replay, useVisibleStory } from "../story-motion";

const JOURNAL_STEPS = [
  "LSN 1 and 2 are synced, complete frames with valid checksums.",
  "A third write stops before its payload and checksum are complete.",
  "Recovery scans left to right and finds the incomplete tail.",
  "Apply LSN 1 and 2 only. Report a torn tail.",
] as const;

export function JournalRecoveryStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(3, 1100);

  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#fff2c8] p-5 text-[#282334]">
      <div role="img" aria-label="Two synced, complete journal frames, LSN 1 and LSN 2, pass the recovery scan. LSN 3 ends halfway through its payload without a checksum. Recovery stops at the torn tail and applies only the first two records.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="max-w-[13rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">
            Recovery stops here.
          </h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">
            {stage < 2 ? "write" : "read back"}
          </span>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((lsn) => {
            const torn = lsn === 3;
            return (
              <div
                key={lsn}
                className="min-w-0 rounded-[10px] p-2.5"
                style={{
                  backgroundColor: torn ? "#ff784f" : "#a9e8cb",
                  visibility: torn && stage === 0 ? "hidden" : "visible",
                  clipPath: torn ? "polygon(0 0, 90% 0, 100% 12%, 91% 24%, 100% 38%, 91% 51%, 100% 65%, 90% 78%, 100% 90%, 90% 100%, 0 100%)" : undefined,
                }}
              >
                <div className="font-mono text-[11px] font-bold">LSN {lsn}</div>
                <div className="mt-3 flex h-9 gap-0.5">
                  <span className="w-1/3 rounded-sm bg-[#282334]/75" />
                  <span className="w-1/3 rounded-sm bg-[#282334]/45" />
                  {!torn && <span className="w-1/3 rounded-sm bg-[#282334]/75" />}
                </div>
                <div className="mt-2 font-mono text-[9px] font-semibold">
                  {torn ? "NO CRC" : "CRC ✓"}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t border-[#282334]/25 pt-3 font-mono text-[10px] font-semibold">
          <span className="rounded-full bg-[#282334] px-2 py-1 text-white">scan</span>
          <span>1 ✓</span><span>2 ✓</span>
          {stage >= 2 && <span className="rounded-full bg-[#ff784f] px-2 py-1">3 stops</span>}
        </div>
        <div className="mt-3 min-h-6 font-mono text-[11px] font-bold">
          {stage === 3 ? "recovered prefix: LSN 1–2" : "read complete frames only"}
        </div>
      </div>
      <div className="mt-3 flex min-h-10 items-start justify-between gap-3">
        <p className="text-[13px] leading-snug font-medium">{JOURNAL_STEPS[stage]}</p>
        {stage === 3 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}

const LSM_STEPS = [
  "Level 0 has two selected runs: A spans 10–30 and B spans 25–50.",
  "Together they select the key range 10–50.",
  "That range intersects both Level-1 runs, X and Y.",
] as const;

function RunBar({ label, start, end, selected, color, animate }: {
  label: string;
  start: number;
  end: number;
  selected: boolean;
  color: string;
  animate: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-y-0 flex items-center justify-center rounded-[7px] font-mono text-[13px] font-bold",
        animate && "transition-colors duration-500",
      )}
      style={{
        left: `${start / 60 * 100}%`,
        width: `${(end - start) / 60 * 100}%`,
        backgroundColor: selected ? color : "#ffffffad",
        color: selected && color === "#7954ef" ? "#ffffff" : "#282334",
      }}
    >
      {label}
    </div>
  );
}

export function LsmOverlapStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1450);

  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#d9cbff] p-5 text-[#282334]">
      <div role="img" aria-label="Selected Level-0 run A spans keys 10 through 30 and B spans 25 through 50. Their selected union spans 10 through 50, intersecting Level-1 run X from 0 through 20 and Y from 40 through 60. Both X and Y must be included in the compaction.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="max-w-[14rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">
            One range pulls in more.
          </h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">
            L0 → L1
          </span>
        </div>

        <div className="mt-7 space-y-3" aria-hidden="true">
          {[
            { label: "L0 A", start: 10, end: 30, color: "#7954ef", selected: true },
            { label: "L0 B", start: 25, end: 50, color: "#7954ef", selected: true },
            { label: "L1 X", start: 0, end: 20, color: "#ff784f", selected: stage === 2 },
            { label: "L1 Y", start: 40, end: 60, color: "#ff784f", selected: stage === 2 },
          ].map((run) => (
            <div key={run.label} className="grid grid-cols-[2.4rem_1fr] items-center gap-2">
              <span className="font-mono text-[10px] font-bold">{run.label.slice(0, 2)}</span>
              <div className="relative h-9 rounded-[7px] bg-[#282334]/10">
                <RunBar {...run} label={run.label.slice(-1)} animate={!reducedMotion} />
              </div>
            </div>
          ))}
        </div>
        <div className="ml-[3rem] mt-3 h-2 rounded-full bg-[#282334]/10" aria-hidden="true">
          <div
            className={cn("h-full rounded-full bg-[#7954ef]", !reducedMotion && "transition-[width] duration-500")}
            style={{ marginLeft: "16.667%", width: stage >= 1 ? "66.667%" : "0%" }}
          />
        </div>
        <div className="ml-[3rem] mt-2 flex justify-between font-mono text-[9px] font-semibold" aria-hidden="true">
          <span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60</span>
        </div>
        <div className="mt-4 flex justify-between gap-2 border-t border-[#282334]/25 pt-3 font-mono text-[10px] font-bold">
          <span>{stage === 0 ? "A: 10–30 · B: 25–50" : "selected union: 10–50"}</span>
          <span>{stage === 2 ? "include X + Y" : "inspect overlaps"}</span>
        </div>
      </div>
      <div className="mt-3 flex min-h-10 items-start justify-between gap-3">
        <p className="text-[13px] leading-snug font-medium">{LSM_STEPS[stage]}</p>
        {stage === 2 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}

const WINDOW_STEPS = [
  "An event at tick 9 adds 4 to the first window.",
  "Tick 10 starts the next window; its event adds 7 there.",
  "Watermark 10 proves the first window cannot change again.",
  "Emit [0,10) once and evict it. [10,20) stays live.",
] as const;

export function StreamWatermarkStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(3, 1100);
  const finalized = stage === 3;

  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#2141b4] p-5 text-white">
      <div role="img" aria-label="With window size 10, an event at tick 9 with value 4 belongs in [0,10), while an event at tick 10 with value 7 belongs in [10,20). Watermark 10 finalizes and emits the first aggregate once, then evicts it. The second window remains live.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="max-w-[14rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em] text-white">
            Tick 10 starts over.
          </h3>
          <span className="shrink-0 rounded-full bg-[#53d9ff] px-2.5 py-1 font-mono text-[10px] font-bold text-[#282334]">
            {stage < 2 ? "event time" : "watermark 10"}
          </span>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-2" aria-hidden="true">
          <div className="min-w-0 rounded-[11px] bg-[#53d9ff] p-3 text-[#282334]">
            <div className="font-mono text-[11px] font-bold">[0,10)</div>
            <div className="mt-5 font-[family-name:var(--font-editorial)] text-[30px] leading-none font-extrabold">+4</div>
            <div className="mt-2 font-mono text-[10px]">tick 9</div>
            <div className="mt-4 border-t border-[#282334]/25 pt-2 font-mono text-[10px] font-bold">
              count 1 · sum 4
            </div>
          </div>
          <div className={cn(
            "min-w-0 rounded-[11px] p-3",
            stage === 0 ? "border border-white/45 bg-white/10 text-white" : "bg-[#ffad83] text-[#282334]",
          )}>
            <div className="font-mono text-[11px] font-bold">[10,20)</div>
            <div className="mt-5 font-[family-name:var(--font-editorial)] text-[30px] leading-none font-extrabold">
              {stage === 0 ? "—" : "+7"}
            </div>
            <div className="mt-2 font-mono text-[10px]">{stage === 0 ? "waiting" : "tick 10"}</div>
            <div className="mt-4 border-t border-current/25 pt-2 font-mono text-[10px] font-bold">
              {stage === 0 ? "no event yet" : "count 1 · sum 7"}
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-semibold">
          <span className={stage >= 2 ? "text-[#b7ff45]" : "text-white/65"}>
            {finalized ? "emitted · state freed" : stage >= 2 ? "watermark 10 ✓" : "waiting for watermark"}
          </span>
          <span>{finalized ? "right window live" : "half-open windows"}</span>
        </div>
      </div>
      <div className="mt-4 flex min-h-10 items-start justify-between gap-3 border-t border-white/25 pt-3">
        <p className="text-[13px] leading-snug">{WINDOW_STEPS[stage]}</p>
        {stage === 3 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}
