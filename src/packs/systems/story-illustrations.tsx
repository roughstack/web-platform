"use client";

import { cn } from "@/lib/utils";
import { Replay, useVisibleStory } from "../story-motion";

const EASY_STEPS = [
  "A is oldest. B is newest. The 66-byte budget is full.",
  "Read A. A hit makes it newest without another backing read.",
  "Insert C. B leaves because one read changed the order.",
] as const;

const SCAN_STEPS = [
  "The same three hot keys keep returning.",
  "A one-time scan fills pure LRU with cold keys.",
  "When hot keys return, pure LRU misses. A protected set still hits.",
] as const;

function CacheTile({
  name,
  charge,
  left,
  visible,
  color,
  still,
}: {
  name: string;
  charge: string;
  left: string;
  visible: boolean;
  color: string;
  still: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute top-0 flex h-[102px] w-[43%] items-end justify-between rounded-[14px] p-3 shadow-[0_8px_0_#28233422] sm:h-[116px]",
        !visible && "invisible",
        !still && "transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
      )}
      style={{ left, opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.72)", backgroundColor: color }}
    >
      <span className="font-mono text-[38px] leading-none font-bold text-[#282334] sm:text-[48px]">{name}</span>
      <span className="font-mono text-[11px] font-semibold text-[#282334]">{charge}</span>
    </div>
  );
}

function CacheEvictionStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1300);
  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[18px] bg-[#ff784f] p-5 text-[#282334] sm:p-6"
    >
      <div role="img" aria-label="A and B fill two 33-byte slots. Reading A makes B the least recently used. Inserting C evicts B, leaving A and C within the 66-byte budget.">
        <div className="flex items-start justify-between gap-3">
          <h3 className="max-w-[18rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.02] font-extrabold tracking-[-.045em] sm:text-[30px]">
            One read. New victim.
          </h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-3 py-1 font-mono text-[10px] text-white">
            {stage === 0 ? "Put A, B" : stage === 1 ? "Get A" : "Put C"}
          </span>
        </div>
        <div className="relative mt-7 h-[142px] sm:h-[154px]">
          <div className="absolute inset-x-0 top-0 flex h-[102px] justify-between gap-[10%] sm:h-[116px]">
            <div className="w-[43%] rounded-[14px] border-2 border-[#282334]/30" />
            <div className="w-[43%] rounded-[14px] border-2 border-[#282334]/30" />
          </div>
          <CacheTile name="A" charge="33 B" left={stage === 1 ? "57%" : "0%"} visible color="#a9e8cb" still={reducedMotion} />
          <CacheTile name="B" charge="33 B" left={stage === 0 ? "57%" : "0%"} visible={stage < 2} color="#b9a1ff" still={reducedMotion} />
          <CacheTile name="C" charge="33 B" left="57%" visible={stage === 2} color="#b7ff45" still={reducedMotion} />
          <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[10px] font-semibold">
            <span>oldest</span><span>newest</span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[#282334]/30 pt-3 font-mono text-[11px] font-semibold">
          <span>capacity 66 B</span><span>used 66 B</span>
        </div>
      </div>
      <div className="mt-4 flex min-h-10 items-start justify-between gap-4">
        <p className="max-w-[32rem] text-[13px] leading-snug font-medium">{EASY_STEPS[stage]}</p>
        {stage === 2 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}

function CacheScanStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(2, 1450);
  const scanned = stage >= 1;
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#7954ef] p-5 text-white sm:p-6">
      <div role="img" aria-label="Hot keys H1, H2, H3 fill the cache. A one-time scan of S1, S2, S3 displaces them under pure LRU, causing misses on return. A protected admission policy retains the hot keys, so their return hits.">
        <div className="flex items-start justify-between gap-3">
          <h3 className="max-w-[19rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.02] font-extrabold tracking-[-.045em] text-white sm:text-[30px]">
            Cold scan. Hot misses.
          </h3>
          <span className="shrink-0 rounded-full bg-[#282334] px-3 py-1 font-mono text-[10px] text-white">
            {stage === 0 ? "hot set" : stage === 1 ? "cold scan" : "return"}
          </span>
        </div>
        <div className="mt-7 space-y-4">
          {[
            { title: "Pure LRU", protected: false },
            { title: "Protected hot set", protected: true },
          ].map((row) => (
            <div key={row.title} className="grid grid-cols-[5.7rem_1fr] items-center gap-2">
              <span className="text-[11px] leading-tight font-semibold sm:text-[12px]">{row.title}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((number) => {
                  const cold = scanned && !row.protected;
                  return (
                    <div
                      key={number}
                      className={cn(
                        "flex h-13 items-center justify-center rounded-[9px] font-mono text-[15px] font-bold text-[#282334] sm:h-15 sm:text-[17px]",
                        !reducedMotion && "transition-[background-color,transform] duration-700",
                        cold && stage === 1 && "-translate-y-1",
                      )}
                      style={{ backgroundColor: cold ? "#ffad83" : "#b7ff45" }}
                    >
                      {cold ? `S${number}` : `H${number}`}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-between border-t border-white/35 pt-3 font-mono text-[11px]">
          <span>{stage === 2 ? "LRU: 3 misses" : "scan: S1, S2, S3"}</span>
          <span>{stage === 2 ? "protected: 3 hits" : "same capacity"}</span>
        </div>
      </div>
      <div className="mt-4 flex min-h-10 items-start justify-between gap-4">
        <p className="max-w-[32rem] text-[13px] leading-snug font-medium">{SCAN_STEPS[stage]}</p>
        {stage === 2 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}

export function CacheStory({ mode }: { mode?: "lru" | "scan" }) {
  return mode === "scan" ? <CacheScanStory /> : <CacheEvictionStory />;
}

const LINK_STEPS = [
  "DATA 0 carries abc toward the receiver.",
  "The receiver delivers abc once and sends ACK 0.",
  "ACK 0 vanishes. The sender cannot know delivery succeeded.",
  "The timer fires, so the sender retransmits DATA 0.",
  "The receiver discards the duplicate and repeats ACK 0.",
] as const;

export function LostAckStory() {
  const { ref, stage, reducedMotion, replay } = useVisibleStory(4, 1120);
  const packet = stage === 2 || stage === 4 ? "ACK 0" : "DATA 0";
  const left = ["3%", "73%", "47%", "50%", "3%"][stage];
  return (
    <div ref={ref} className="overflow-hidden rounded-[18px] bg-[#282334] p-5 text-white sm:p-6">
      <div role="img" aria-label="Sender sends DATA 0 containing abc. Receiver delivers abc once and sends ACK 0, but the ACK is lost. After timeout the sender resends DATA 0. Receiver recognizes the duplicate, does not deliver again, and repeats ACK 0, which reaches the sender.">
        <div className="flex items-start justify-between gap-3">
          <h3 className="max-w-[19rem] font-[family-name:var(--font-editorial)] text-[25px] leading-[1.02] font-extrabold tracking-[-.045em] text-white sm:text-[30px]">
            Delivered once. ACKed twice.
          </h3>
          <span className="shrink-0 rounded-full bg-[#b7ff45] px-3 py-1 font-mono text-[10px] font-bold text-[#282334]">
            seq 0
          </span>
        </div>
        <div className="mt-6 flex justify-between font-mono text-[11px] font-semibold text-[#b9a1ff]">
          <span>sender</span><span>receiver</span>
        </div>
        <div className="relative mt-3 h-[120px]">
          <div className="absolute top-[51px] right-[10%] left-[10%] h-[2px] bg-[#b9a1ff]/45" />
          <div className="absolute top-[43px] left-[3%] size-[18px] rounded-full bg-[#53d9ff]" />
          <div className="absolute top-[43px] right-[3%] size-[18px] rounded-full bg-[#b7ff45]" />
          <div
            className={cn(
              "absolute top-[27px] flex h-[48px] w-[24%] min-w-[72px] items-center justify-center rounded-[10px] font-mono text-[12px] font-bold text-[#282334]",
              !reducedMotion && "transition-[left,background-color] duration-700 ease-in-out",
            )}
            style={{ left, backgroundColor: packet === "ACK 0" ? "#b7ff45" : "#53d9ff" }}
          >
            {packet}
          </div>
          {stage === 2 && (
            <div className="absolute top-[77px] left-[48%] font-mono text-[11px] font-bold text-[#ff784f]">ACK lost ×</div>
          )}
          {stage === 3 && (
            <div className="absolute top-[77px] left-[4%] font-mono text-[11px] font-bold text-[#ffad83]">timeout → retry</div>
          )}
          {stage === 4 && (
            <div className="absolute top-[77px] right-[4%] font-mono text-[11px] font-bold text-[#b7ff45]">duplicate discarded</div>
          )}
        </div>
        <div className="flex justify-between border-t border-white/25 pt-3 font-mono text-[11px]">
          <span>source: abc</span><span>delivered: {stage === 0 ? "0" : "1"} copy</span>
        </div>
      </div>
      <div className="mt-4 flex min-h-10 items-start justify-between gap-4">
        <p className="max-w-[32rem] text-[13px] leading-snug text-[#f2f0ed]">{LINK_STEPS[stage]}</p>
        {stage === 4 && !reducedMotion && <Replay onClick={replay} />}
      </div>
    </div>
  );
}
