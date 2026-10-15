/**
 * A small, code-native visual signature for each challenge family.
 * These are orientation cues on cards and banners; the statement figures carry
 * the full explanation and text alternative.
 */
import { cn } from "@/lib/utils";

type Family =
  | "cache" | "chunk" | "scheduler" | "queue" | "gate" | "journal"
  | "link" | "lsm" | "stream" | "compaction" | "victim" | "wear";

const FAMILIES: Record<Family, { surface: string; primary: string; secondary: string }> = {
  cache: { surface: "#baf2d5", primary: "#147d5b", secondary: "#f7bd35" },
  chunk: { surface: "#d9d4ff", primary: "#5345cb", secondary: "#8bedd0" },
  scheduler: { surface: "#ffe3a4", primary: "#b35b18", secondary: "#6c8bff" },
  queue: { surface: "#c9e9ff", primary: "#2869d2", secondary: "#ff9f52" },
  gate: { surface: "#ccf5db", primary: "#187f58", secondary: "#ffae3d" },
  journal: { surface: "#ffd3c5", primary: "#cc4d34", secondary: "#6d8be3" },
  link: { surface: "#d7ddff", primary: "#405edf", secondary: "#ff986c" },
  lsm: { surface: "#e4d8ff", primary: "#6a4ac8", secondary: "#5cc4aa" },
  stream: { surface: "#c5f0ea", primary: "#147f87", secondary: "#edaa24" },
  compaction: { surface: "#c9ebff", primary: "#1a70ad", secondary: "#ffbb3c" },
  victim: { surface: "#ffddbe", primary: "#c45e28", secondary: "#54a7d3" },
  wear: { surface: "#f5d5e7", primary: "#ac498a", secondary: "#5eb9a0" },
};

export function challengeFamily(slug: string): Family {
  if (slug.startsWith("cache-pressure")) return "cache";
  if (slug.startsWith("chunk-store")) return "chunk";
  if (slug.startsWith("deadline-scheduler")) return "scheduler";
  if (slug.startsWith("durable-queue")) return "queue";
  if (slug.startsWith("fair-gate")) return "gate";
  if (slug.startsWith("journal-recovery")) return "journal";
  if (slug.startsWith("lossy-link")) return "link";
  if (slug.startsWith("lsm-compactor")) return "lsm";
  if (slug.startsWith("stream-windows")) return "stream";
  if (slug.startsWith("victim-selection")) return "victim";
  if (slug.startsWith("wear-levelling")) return "wear";
  return "compaction";
}

export function ChallengeArtwork({ slug, className }: { slug: string; className?: string }) {
  const family = challengeFamily(slug);
  const weightedCache = family === "cache" && slug.endsWith("-medium");
  const { surface, primary, secondary } = weightedCache
    ? { surface: "#e4dcff", primary: "#6847c7", secondary: "#f4ce57" }
    : FAMILIES[family];
  const ink = "#172730";

  return (
    <svg
      viewBox="0 0 240 136"
      aria-hidden="true"
      focusable="false"
      className={cn("h-full w-full", className)}
      style={{ backgroundColor: surface }}
    >
      <g stroke={ink} strokeWidth=".5" opacity=".11">
        {[24, 48, 72, 96, 120, 144, 168, 192, 216].map((x) => (
          <path key={`v-${x}`} d={`M${x} 0v136`} />
        ))}
        {[24, 48, 72, 96, 120].map((y) => (
          <path key={`h-${y}`} d={`M0 ${y}h240`} />
        ))}
      </g>
      <path d="M13 27V14h14M213 108v14h14" fill="none" stroke={ink} strokeWidth="1.3" opacity=".4" />
      <circle cx="211" cy="21" r="4" fill={secondary} stroke={ink} strokeWidth="1.4" />
      {weightedCache && (
        <g stroke={ink} strokeWidth="2">
          <path d="M35 98h165" strokeDasharray="4 5" opacity=".45" />
          <rect x="36" y="63" width="33" height="33" rx="7" fill="#fff" />
          <rect x="78" y="47" width="57" height="49" rx="9" fill={primary} />
          <rect x="144" y="72" width="46" height="24" rx="7" fill={secondary} />
          <circle cx="177" cy="40" r="19" fill="#fff" />
          <path d="M177 29v12l8 5M44 44c17-17 33-20 52-15m-6-5 6 5-7 4" fill="none" strokeLinecap="round" />
        </g>
      )}
      {family === "cache" && !weightedCache && (
        <g stroke={ink} strokeWidth="2">
          <path d="M45 96h145" strokeDasharray="4 5" opacity=".45" />
          <rect x="46" y="47" width="59" height="47" rx="10" fill="#fff" />
          <rect x="116" y="47" width="59" height="47" rx="10" fill={primary} />
          <circle cx="74" cy="70" r="11" fill={secondary} />
          <circle cx="145" cy="70" r="11" fill="#fff" />
          <path d="M83 31c25-16 51-13 70 1m-5-7 5 7-8 1" fill="none" strokeLinecap="round" />
        </g>
      )}
      {family === "chunk" && (
        <g stroke={ink} strokeWidth="2">
          {[0, 1, 2].map((i) => <rect key={i} x={46 + i * 16} y={42 + i * 15} width="112" height="42" rx="7" fill={i === 2 ? primary : "#fff"} />)}
          <path d="m120 98 8 8 15-17" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="61" y="77" width="28" height="9" rx="3" fill={secondary} stroke="none" />
        </g>
      )}
      {family === "scheduler" && (
        <g stroke={ink} strokeWidth="2">
          <path d="M38 96h170m-155 8V38m48 66V38m48 66V38m48 66V38" opacity=".4" />
          <rect x="53" y="52" width="86" height="22" rx="6" fill={primary} />
          <rect x="101" y="78" width="80" height="18" rx="6" fill={secondary} />
          <circle cx="183" cy="49" r="12" fill="#fff" />
          <path d="M183 42v8l5 3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {family === "queue" && (
        <g stroke={ink} strokeWidth="2">
          {[0, 1, 2].map((i) => <rect key={i} x={40 + i * 53} y={50} width="42" height="43" rx="8" fill={i === 0 ? primary : i === 1 ? secondary : "#fff"} />)}
          <path d="M195 70h18m-7-7 7 7-7 7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M53 60h16m-16 8h11m42-8h16m-16 8h11m42-8h16m-16 8h11" stroke="#fff" strokeLinecap="round" />
        </g>
      )}
      {family === "gate" && (
        <g stroke={ink} strokeWidth="2">
          <rect x="85" y="47" width="75" height="57" rx="12" fill="#fff" />
          <path d="M100 47V34h45v13" fill="none" strokeLinecap="round" />
          {[0, 1, 2].map((i) => <circle key={i} cx={106 + i * 18} cy="73" r="7" fill={i === 2 ? secondary : primary} />)}
          <path d="M40 74h36m-8-8 8 8-8 8m101-8h33" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {family === "journal" && (
        <g stroke={ink} strokeWidth="2">
          <rect x="57" y="26" width="112" height="91" rx="8" fill="#fff" />
          {[0, 1, 2].map((i) => <g key={i}><circle cx="76" cy={48 + i * 23} r="5" fill={i === 2 ? secondary : primary} /><path d={`M90 ${48 + i * 23}h56`} opacity={i === 2 ? ".35" : "1"} /></g>)}
          <path d="m154 84 19 8-19 9" fill={surface} strokeDasharray="3 3" />
        </g>
      )}
      {family === "link" && (
        <g stroke={ink} strokeWidth="2">
          <circle cx="50" cy="69" r="21" fill={primary} />
          <circle cx="190" cy="69" r="21" fill={secondary} />
          <path d="M72 58c32-27 63-27 96 0m-2 27c-29 24-63 24-93 0" fill="none" strokeDasharray="6 5" />
          <rect x="109" y="37" width="23" height="17" rx="4" fill="#fff" />
          <path d="m111 87 18-18m-17 0 18 18" stroke={primary} strokeWidth="3" />
        </g>
      )}
      {family === "lsm" && (
        <g stroke={ink} strokeWidth="2">
          <rect x="48" y="34" width="44" height="22" rx="5" fill={primary} />
          <rect x="99" y="34" width="44" height="22" rx="5" fill={secondary} />
          <path d="M71 63v15m50-15v15m-50 0h50m-25 0v8" fill="none" strokeLinecap="round" />
          <rect x="61" y="87" width="96" height="23" rx="5" fill="#fff" />
          <path d="M73 99h71" stroke={primary} strokeWidth="5" strokeLinecap="round" />
        </g>
      )}
      {family === "stream" && (
        <g stroke={ink} strokeWidth="2">
          <path d="M38 100h174" />
          {[0, 1, 2].map((i) => <rect key={i} x={47 + i * 53} y="54" width="47" height="46" rx="5" fill={i === 1 ? primary : "#fff"} />)}
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={60 + i * 37} cy={78 - (i % 2) * 12} r="6" fill={secondary} />)}
          <path d="M103 33v77" strokeDasharray="4 4" />
        </g>
      )}
      {family === "compaction" && (
        <g stroke={ink} strokeWidth="2">
          {[0, 1, 2, 3].map((i) => <rect key={i} x={35 + i * 42} y="46" width="34" height="37" rx="6" fill={i === 1 ? surface : i === 3 ? secondary : primary} strokeDasharray={i === 1 ? "4 3" : undefined} />)}
          <path d="M54 99h117m-9-8 9 8-9 8" fill="none" strokeLinecap="round" />
        </g>
      )}
      {family === "victim" && (
        <g stroke={ink} strokeWidth="2">
          {[0, 1, 2].map((col) => [0, 1].map((row) => <rect key={`${col}-${row}`} x={48 + col * 48} y={37 + row * 43} width="39" height="36" rx="6" fill={col === 1 ? primary : row === 0 ? "#fff" : secondary} />))}
          <path d="m107 27 9-8 9 8" fill="none" strokeLinecap="round" />
        </g>
      )}
      {family === "wear" && (
        <g stroke={ink} strokeWidth="2">
          <path d="M44 105h157" />
          {[46, 84, 122, 160].map((x, i) => <rect key={x} x={x} y={66 - i * 8} width="26" height={39 + i * 8} rx="5" fill={i % 2 ? primary : secondary} />)}
          <path d="M50 40c39-19 89-19 134 0m-7-8 7 8-9 5" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
