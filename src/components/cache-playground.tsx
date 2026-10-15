"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";

const TRACE = [
  {
    command: "put A+B",
    heading: "Two entries fit.",
    explanation: "A arrived first, so it is the oldest entry.",
    entries: [
      { key: "A", role: "oldest", tone: "bg-voltage" },
      { key: "B", role: "newest", tone: "bg-ice" },
    ],
    evicted: "none",
  },
  {
    command: "get A",
    heading: "A gets a second chance.",
    explanation: "Reading A makes it newest. B is now the eviction candidate.",
    entries: [
      { key: "B", role: "oldest", tone: "bg-ice" },
      { key: "A", role: "newest", tone: "bg-voltage" },
    ],
    evicted: "none",
  },
  {
    command: "put C",
    heading: "C arrives. B leaves.",
    explanation: "The cache keeps A and C because B was least recently used.",
    entries: [
      { key: "A", role: "oldest", tone: "bg-voltage" },
      { key: "C", role: "newest", tone: "bg-spark" },
    ],
    evicted: "B",
  },
] as const;

export function CachePlayground() {
  const [step, setStep] = useState(0);
  const current = TRACE[step];

  return (
    <div className="relative mx-auto w-full max-w-[500px] overflow-hidden rounded-24 border border-[#a7b8ee] bg-panel p-4 shadow-[0_28px_70px_-36px_rgba(28,60,192,.45)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-voltage px-3 py-1 font-mono text-tiny font-bold tracking-[.08em] text-ink uppercase">
          <span className="size-1.5 rounded-full bg-circuit" aria-hidden="true" />
          Live trace / cache
        </span>
        <span className="font-mono text-tiny font-semibold tracking-[.08em] text-muted uppercase">2 slots / LRU</span>
      </div>

      <h2 className="mt-4 text-title-3 font-bold tracking-[-.035em] sm:text-title-4">A tiny decision changes everything.</h2>
      <p className="mt-2 text-mini text-body">Tap a command. Watch which entry survives.</p>

      <div className="grid-backdrop relative mt-5 overflow-hidden rounded-16 border border-[#a9c4ec] bg-[#dfeaff] p-3 sm:p-4">
        <div className="relative flex items-center justify-between gap-2 border-b border-[#b4c6de] pb-2 font-mono text-tiny font-semibold tracking-[.08em] text-[#31506b] uppercase">
          <span>Cache state</span>
          <span>0{step + 1} / 03</span>
        </div>
        <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-[#b9cbea]" aria-hidden="true">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / TRACE.length) * 100}%` }} />
        </div>

        <div key={step} className="signal-step relative mt-4 grid grid-cols-2 gap-3" aria-label="Cache entries, oldest to newest">
          {current.entries.map((entry) => (
            <div key={entry.key} className="rounded-12 border-2 border-[#17324a] bg-panel p-2.5 shadow-[4px_4px_0_#17324a] sm:p-3">
              <div className="flex items-center justify-between">
                <span className={`grid size-9 place-items-center rounded-8 border border-[#17324a] ${entry.tone} font-mono text-title-2 font-bold text-ink sm:size-11`}>
                  {entry.key}
                </span>
                <span className="size-2 rounded-full bg-circuit" aria-hidden="true" />
              </div>
              <p className="mt-2 font-mono text-tiny font-semibold tracking-[.07em] text-[#31506b] uppercase">{entry.role}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#b4c6de] pt-3 font-mono text-tiny text-[#31506b]">
          <span>← oldest <span className="px-1 text-[#31506b]">/</span> newest →</span>
          <span>evicted: <strong className={current.evicted === "none" ? "text-[#31506b]" : "text-spark-ink"}>{current.evicted}</strong></span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Replay cache operations">
        {TRACE.map((item, index) => (
          <button
            key={item.command}
            type="button"
            onClick={() => setStep(index)}
            aria-pressed={step === index}
            className={`min-h-13 rounded-10 border px-1.5 py-2 text-center transition-[background-color,border-color,transform] duration-150 motion-safe:hover:-translate-y-0.5 ${step === index ? "border-accent bg-accent text-white shadow-[0_4px_0_#142f9e]" : "border-edge-strong bg-panel text-body hover:border-accent hover:bg-accent-tint"}`}
          >
            <span className="block font-mono text-tiny opacity-80">0{index + 1}</span>
            <span className="block font-mono text-[.7rem] font-bold whitespace-nowrap sm:text-mini">{item.command}</span>
          </button>
        ))}
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-5 min-h-[73px]">
        <p className="flex items-center gap-2 text-small font-bold text-ink">
          <RotateCw className="size-4 text-circuit" aria-hidden="true" />
          {current.heading}
        </p>
        <p className="mt-1 text-mini text-muted">{current.explanation}</p>
      </div>

      <Link href="/challenges/cache-pressure-easy" className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-mono text-mini font-bold text-link underline-offset-4 hover:underline">
        Build the cache yourself <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
