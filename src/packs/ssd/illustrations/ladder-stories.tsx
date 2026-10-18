"use client";

import { cn } from "@/lib/utils";
import { Replay, useVisibleStory } from "@/packs/story-motion";

function Footer({ text, final, still, replay }: { text: string; final: boolean; still: boolean; replay: () => void }) {
  return (
    <div className="mt-4 flex min-h-10 items-start justify-between gap-3 border-t border-current/25 pt-3">
      <p className="text-[13px] leading-snug font-medium">{text}</p>
      {final && !still && <Replay onClick={replay} />}
    </div>
  );
}

export const COMPACTION_FRAMES = [
  [4, -1, -1, 7, -1, 2, -1, -1, 9, -1, -1, 5],
  [4, 2, -1, 7, -1, -1, -1, -1, 9, -1, -1, 5],
  [4, 2, 9, 7, -1, -1, -1, -1, -1, -1, -1, 5],
  [4, 2, 9, 7, 5, -1, -1, -1, -1, -1, -1, -1],
] as const;
const COMPACTION_STEPS = [
  "Five live values; three sit beyond the required prefix.",
  "Move slot 5 into the first hole, slot 1.",
  "Move slot 8 into the next hole, slot 2.",
  "Move slot 11 into slot 4. Slot 3 never moves.",
] as const;

export function CompactionStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(3, 1200);
  const moves = ["find the holes", "5 → 1", "8 → 2", "11 → 4"][stage];
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#ffd5ba] p-5 text-[#282334]">
      <div role="img" aria-label="Five live values occupy slots 0, 3, 5, 8, and 11. The target prefix is slots 0 through 4. In three moves, slot 5 goes to hole 1, slot 8 to hole 2, and slot 11 to hole 4. Slot 3 remains in place. The final array is 4, 2, 9, 7, 5 followed by seven empty slots.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Three moves. No more.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">{stage} / 3</span>
        </div>
        <div className="mt-7 rounded-[12px] bg-[#282334] p-3 text-white" aria-hidden="true">
          <div className="mb-2 flex justify-between font-mono text-[10px] font-bold"><span>PACK INTO 0–4</span><span>{moves}</span></div>
          <div className="grid grid-cols-6 gap-1">
            {COMPACTION_FRAMES[stage].map((value, index) => (
              <div key={index} className={cn("flex h-11 flex-col items-center justify-center rounded-[5px] font-mono text-[14px] font-bold", value === -1 ? "border border-white/25 text-white/55" : index < 5 ? "bg-[#53d9ff] text-[#282334]" : "bg-[#ff784f] text-[#282334]")}>
                <span className="text-[8px] leading-none opacity-70">{index}</span>
                <span>{value === -1 ? "·" : value}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] font-bold"><span>target: 5 live</span><span>{stage === 3 ? "free suffix: 7" : "holes in prefix: 3"}</span></div>
        </div>
      </div>
      <Footer text={COMPACTION_STEPS[stage]} final={stage === 3} still={reducedMotion} replay={replay} />
    </div>
  );
}

const VICTIM_STEPS = [
  "Block 1 has two live pages; block 3 has only one.",
  "Choose block 3. Copy its one live page into reserve.",
  "Erase the whole block. Seven net free pages are gained.",
] as const;

function PageRow({ label, valid, active, erased }: { label: string; valid: number; active: boolean; erased: boolean }) {
  return (
    <div className={cn("rounded-[9px] p-2.5", active ? "bg-[#b7ff45] text-[#282334]" : "bg-white/15 text-white")}>
      <div className="mb-2 flex justify-between font-mono text-[10px] font-bold"><span>BLOCK {label}</span><span>{erased ? "8 FREE" : valid + " LIVE"}</span></div>
      <div className="grid grid-cols-8 gap-0.5">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={cn("h-9 rounded-[3px]", erased ? "border border-[#282334]/30 bg-white/60" : i < valid ? active ? "bg-[#282334]" : "bg-[#53d9ff]" : active ? "bg-[#282334]/15" : "bg-white/20")} />
        ))}
      </div>
      <div className="mt-2 font-mono text-[9px] font-semibold">{erased ? "one copied → eight erased" : (8 - valid) + " dead · " + valid + " to copy"}</div>
    </div>
  );
}

export function VictimStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1500);
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#2141b4] p-5 text-white">
      <div role="img" aria-label="Each block has eight pages. Block 1 holds two live and six dead pages, while block 3 holds one live and seven dead. Selecting block 3 migrates its one live page into reserve, erases all eight pages, and yields seven net free pages. Block 1 would need two migrations.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em] text-white">One copy. Eight free.</h3>
          <span className="shrink-0 rounded-full bg-[#53d9ff] px-2.5 py-1 font-mono text-[10px] font-bold text-[#282334]">8 pages / block</span>
        </div>
        <div className="mt-7 space-y-2" aria-hidden="true">
          <PageRow label="1" valid={2} active={false} erased={false} />
          <PageRow label="3" valid={1} active={stage >= 1} erased={stage === 2} />
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-bold">
          <span>{stage === 0 ? "compare migration cost" : "select block 3"}</span><span>{stage === 2 ? "+7 net free" : "reserve holds the copy"}</span>
        </div>
      </div>
      <Footer text={VICTIM_STEPS[stage]} final={stage === 2} still={reducedMotion} replay={replay} />
    </div>
  );
}

const WEAR_STEPS = [
  "This worked snapshot offers two mostly dead blocks.",
  "Greedy picks block 3: one migration, but 17 prior erases.",
  "Block 1 costs one extra migration and avoids the worn tail.",
] as const;

export function WearChoiceStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1450);
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#d9cbff] p-5 text-[#282334]">
      <div role="img" aria-label="In the worked snapshot, block 3 has one live page, seven dead pages, and 17 prior erases. Block 1 has two live pages, six dead pages, and four prior erases. Greedy would choose block 3, copying one page but further wearing the worst block. Choosing block 1 copies one additional page but leaves block 3's erase count unchanged. This is a wear-aware trade-off, not a guaranteed global optimum.">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-[family-name:var(--font-editorial)] text-[25px] leading-[1.03] font-extrabold tracking-[-.04em]">Cheap can wear out.</h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-2.5 py-1 font-mono text-[10px] text-white">one decision</span>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-2" aria-hidden="true">
          {[
            { block: "3", live: 1, dead: 7, erase: 17, chosen: false },
            { block: "1", live: 2, dead: 6, erase: 4, chosen: true },
          ].map((candidate) => (
            <div key={candidate.block} className={cn("min-w-0 rounded-[11px] p-3", candidate.chosen && stage === 2 ? "bg-[#b7ff45]" : "bg-white/75")}>
              <div className="font-mono text-[10px] font-bold">BLOCK {candidate.block}</div>
              <div className="mt-3 font-[family-name:var(--font-editorial)] text-[32px] leading-none font-extrabold">{candidate.erase}</div>
              <div className="mt-1 font-mono text-[9px] font-semibold">prior erases</div>
              <div className="mt-3 h-2 rounded-full bg-[#282334]/15"><div className={cn("h-full rounded-full", candidate.chosen ? "bg-[#2141b4]" : "bg-[#ff784f]")} style={{ width: `${candidate.erase / 17 * 100}%` }} /></div>
              <div className="mt-3 font-mono text-[10px] font-bold">{candidate.live} live · {candidate.dead} dead</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between gap-2 font-mono text-[10px] font-bold">
          <span>{stage === 0 ? "compare both costs" : stage === 1 ? "greedy → block 3" : "wear-aware → block 1"}</span>
          <span>{stage === 2 ? "+1 migration" : "tail: 17 erases"}</span>
        </div>
      </div>
      <Footer text={WEAR_STEPS[stage]} final={stage === 2} still={reducedMotion} replay={replay} />
    </div>
  );
}
