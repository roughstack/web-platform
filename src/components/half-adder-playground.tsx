"use client";

import { useState } from "react";

type Bit = 0 | 1;

const ROWS: { a: Bit; b: Bit; sum: Bit; carry: Bit }[] = [
  { a: 0, b: 0, sum: 0, carry: 0 },
  { a: 0, b: 1, sum: 1, carry: 0 },
  { a: 1, b: 0, sum: 1, carry: 0 },
  { a: 1, b: 1, sum: 0, carry: 1 },
];

export function HalfAdderPlayground() {
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const [signal, setSignal] = useState(0);
  const sum = (a ^ b) as Bit;
  const carry = (a & b) as Bit;

  function flip(bit: "a" | "b") {
    if (bit === "a") setA((value) => (value === 0 ? 1 : 0));
    else setB((value) => (value === 0 ? 1 : 0));
    setSignal((value) => value + 1);
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#26345c] bg-[#101a37] text-white shadow-[0_30px_80px_-35px_rgba(19,38,108,.7)]" aria-label="Interactive half-adder experiment">
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-[#c7ff65] shadow-[0_0_16px_#c7ff65]" />
          <span className="font-mono text-xs font-bold tracking-[.14em] text-[#dce7ff] uppercase">Live circuit / 001</span>
        </div>
        <span className="font-mono text-[10px] tracking-widest text-[#b5c6f4] uppercase">Half-adder</span>
      </div>

      <div className="px-5 pt-6 pb-5 sm:px-7">
        <p className="text-sm text-[#d1dcf9]">Two bits go in. Flip either switch and watch what comes out.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {([ ["a", a], ["b", b] ] as const).map(([name, value]) => (
            <button
              key={name}
              type="button"
              aria-label={`Input ${name.toUpperCase()}, ${value}. Flip to ${value === 0 ? 1 : 0}`}
              aria-pressed={value === 1}
              onClick={() => flip(name)}
              className={`group flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#c7ff65] ${value ? "border-[#c7ff65] bg-[#293d43]" : "border-[#405174] bg-[#172440] hover:border-[#8fa8da]"}`}
            >
              <span className="font-mono text-xs font-bold tracking-widest text-[#c8d8fa] uppercase">Input {name}</span>
              <span className={`grid size-10 place-items-center rounded-xl font-mono text-2xl font-bold ${value ? "bg-[#c7ff65] text-[#10211a]" : "bg-[#2a3a58] text-white"}`}>{value}</span>
            </button>
          ))}
        </div>

        <div className="relative mt-5 rounded-2xl border border-[#36466d] bg-[#0b142c] p-4 sm:p-5">
          <div aria-hidden="true" className="absolute inset-0 opacity-35 [background-image:radial-gradient(#526791_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-3 sm:gap-x-4">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[#b6c9f2] uppercase">A + B</span>
            <span aria-hidden="true" className="font-mono text-lg text-[#c7ff65]">→</span>
            <span className="font-mono text-[11px] font-semibold tracking-wider text-[#b6c9f2] uppercase">Outputs</span>
            <div className="flex items-center gap-2 font-mono text-2xl font-bold"><span className={a ? "text-[#c7ff65]" : "text-[#b6c9f2]"}>{a}</span><span className="text-[#8298c4]">+</span><span className={b ? "text-[#c7ff65]" : "text-[#b6c9f2]"}>{b}</span></div>
            <svg key={signal} aria-hidden="true" viewBox="0 0 60 96" className="h-20 w-9 overflow-visible sm:w-14">
              <path d="M0 48H18V22H60M18 48V74H60" fill="none" stroke="#536789" strokeWidth="2" />
              <path pathLength="1" d="M0 48H18V22H60" fill="none" stroke={sum ? "#69dafa" : "#7083a5"} strokeWidth={sum ? "3" : "2"} className="circuit-path" />
              <path pathLength="1" d="M0 48H18V74H60" fill="none" stroke={carry ? "#ff977e" : "#7083a5"} strokeWidth={carry ? "3" : "2"} className="circuit-path" />
              <circle cx="18" cy="48" r="3" fill="#c7ff65" />
              <circle cx="60" cy="22" r="3" fill={sum ? "#69dafa" : "#7083a5"} />
              <circle cx="60" cy="74" r="3" fill={carry ? "#ff977e" : "#7083a5"} />
            </svg>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#566898] bg-[#1c2b4e] px-2.5 py-1.5">
                <span className="font-mono text-[10px] text-[#b6c9f2]">XOR / SUM</span>
                <span data-testid="sum-output" className={`grid size-7 place-items-center rounded-md font-mono text-lg font-bold ${sum ? "bg-[#69dafa] text-[#082638]" : "bg-[#344766] text-[#dce7ff]"}`}>{sum}</span>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#566898] bg-[#1c2b4e] px-2.5 py-1.5">
                <span className="font-mono text-[10px] text-[#b6c9f2]">AND / CARRY</span>
                <span data-testid="carry-output" className={`grid size-7 place-items-center rounded-md font-mono text-lg font-bold ${carry ? "bg-[#ff977e] text-[#391709]" : "bg-[#344766] text-[#dce7ff]"}`}>{carry}</span>
              </div>
            </div>
          </div>
        </div>

        <p aria-live="polite" className="mt-4 min-h-10 text-sm leading-5 text-[#e0e9ff]">
          {a} + {b} = <strong className="text-white">{carry}{sum}</strong> in binary. {carry ? "Both bits are on, so the extra 1 carries over." : sum ? "One bit is on, so the sum is 1." : "Both bits are off, so nothing carries."}
        </p>
      </div>

      <div className="border-t border-white/15 bg-[#152346] px-5 py-4 sm:px-7">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] font-bold tracking-[.13em] text-[#b6c9f2] uppercase"><span>Truth table</span><span>Current row glows</span></div>
        <table className="w-full table-fixed font-mono text-xs tabular-nums" aria-label="Half-adder truth table">
          <thead><tr className="text-[#b6c9f2]"><th className="py-1 text-left font-medium">A</th><th className="py-1 text-left font-medium">B</th><th className="py-1 text-left font-medium">SUM</th><th className="py-1 text-left font-medium">CARRY</th></tr></thead>
          <tbody>{ROWS.map((row) => {
            const active = a === row.a && b === row.b;
            return <tr key={`${row.a}${row.b}`} data-testid={`truth-row-${row.a}${row.b}`} aria-current={active ? "true" : undefined} className={active ? "bg-[#c7ff65] font-bold text-[#132216]" : "border-t border-white/10 text-[#dce7ff]"}><td className="rounded-l-md py-1.5 pl-2">{row.a}</td><td>{row.b}</td><td>{row.sum}</td><td className="rounded-r-md">{row.carry}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
