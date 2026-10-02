import { ArrowDown, ArrowRight, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "signal" | "warning" | "danger" | "neutral";

interface DiagramItem {
  readonly label: string;
  readonly detail?: string;
  readonly tone?: Tone;
}

interface FlowDiagramProps {
  readonly label?: string;
  readonly nodes?: readonly DiagramItem[];
  readonly edges?: readonly string[];
}

interface StateDiagramProps {
  readonly label?: string;
  readonly states?: readonly DiagramItem[];
  readonly transitions?: readonly string[];
}

interface TimelineWindow {
  readonly label: string;
  readonly range?: string;
  readonly events?: readonly DiagramItem[];
  readonly finalized?: boolean;
}

interface TimelineDiagramProps {
  readonly label?: string;
  readonly windows?: readonly TimelineWindow[];
  readonly watermark?: string;
}

const TONES: Readonly<Record<Tone, string>> = {
  accent: "border-accent/50 bg-accent/15",
  signal: "border-signal/45 bg-signal/10",
  warning: "border-warning/45 bg-warning/10",
  danger: "border-danger/45 bg-danger/10",
  neutral: "border-edge-strong bg-raised/40",
};

function toneClass(tone: unknown): string {
  return typeof tone === "string" && tone in TONES ? TONES[tone as Tone] : TONES.neutral;
}

function items(value: unknown): DiagramItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.label !== "string" || candidate.label.trim().length === 0) return [];
    return [{
      label: candidate.label,
      detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
      tone: typeof candidate.tone === "string" && candidate.tone in TONES
        ? candidate.tone as Tone
        : undefined,
    }];
  });
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function DiagramFallback() {
  return (
    <div className="rounded-8 border border-dashed border-edge px-3 py-4 text-center text-micro text-quiet">
      Diagram data is unavailable.
    </div>
  );
}

function NodeCard({ item, index, state }: { item: DiagramItem; index: number; state?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-32 flex-1 border px-3 py-2.5",
        state ? "rounded-full text-center" : "rounded-8",
        toneClass(item.tone),
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-tiny tabular-nums text-quiet" aria-hidden>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-mini font-medium text-ink">{item.label}</span>
      </div>
      {item.detail && <p className="mt-1 text-micro leading-relaxed text-muted">{item.detail}</p>}
    </div>
  );
}

export function FlowDiagram({ label, nodes: rawNodes, edges: rawEdges }: FlowDiagramProps) {
  const nodes = items(rawNodes);
  const edges = strings(rawEdges);
  if (nodes.length < 2) return <DiagramFallback />;

  const description = label ?? nodes.map((node) => node.label).join(" then ");
  return (
    <div role="img" aria-label={description} className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-stretch gap-2">
        {nodes.map((node, index) => (
          <div key={`${node.label}-${index}`} className="flex items-center gap-2">
            <NodeCard item={node} index={index} />
            {index < nodes.length - 1 && (
              <div className="flex w-12 shrink-0 flex-col items-center gap-1 text-center">
                {edges[index] && <span className="text-tiny leading-tight text-quiet">{edges[index]}</span>}
                <ArrowRight className="size-4 text-muted" aria-hidden />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StateDiagram({
  label,
  states: rawStates,
  transitions: rawTransitions,
}: StateDiagramProps) {
  const states = items(rawStates);
  const transitions = strings(rawTransitions);
  if (states.length < 2) return <DiagramFallback />;

  return (
    <div role="img" aria-label={label ?? `State sequence: ${states.map((state) => state.label).join(", ")}`}>
      <div className="mx-auto flex max-w-sm flex-col items-stretch gap-1.5">
        {states.map((state, index) => (
          <div key={`${state.label}-${index}`}>
            <NodeCard item={state} index={index} state />
            {index < states.length - 1 && (
              <div className="flex h-10 flex-col items-center justify-center">
                <ArrowDown className="size-4 text-muted" aria-hidden />
                {transitions[index] && (
                  <span className="rounded-full bg-canvas px-2 text-tiny text-quiet">
                    {transitions[index]}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimelineDiagram({
  label,
  windows: rawWindows,
  watermark,
}: TimelineDiagramProps) {
  const windows = Array.isArray(rawWindows)
    ? rawWindows.flatMap((window) => {
        if (!window || typeof window !== "object") return [];
        const candidate = window as Record<string, unknown>;
        if (typeof candidate.label !== "string") return [];
        return [{
          label: candidate.label,
          range: typeof candidate.range === "string" ? candidate.range : undefined,
          events: items(candidate.events),
          finalized: candidate.finalized === true,
        }];
      })
    : [];
  if (windows.length === 0) return <DiagramFallback />;

  return (
    <div role="img" aria-label={label ?? `Timeline with ${windows.length} windows`} className="space-y-3">
      <div className="flex items-center gap-2 text-micro text-muted">
        <Clock3 className="size-3.5" aria-hidden />
        <span>Event time moves left to right</span>
        <span className="h-px flex-1 bg-edge-strong" aria-hidden />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {windows.map((window, index) => (
          <div
            key={`${window.label}-${index}`}
            className={cn(
              "rounded-8 border p-3",
              window.finalized ? "border-signal/45 bg-signal/10" : "border-edge-strong bg-raised/30",
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-mini font-medium text-ink">{window.label}</span>
              {window.range && <span className="font-mono text-tiny text-quiet">{window.range}</span>}
            </div>
            <div className="mt-2 flex min-h-8 flex-wrap gap-1.5">
              {window.events.length > 0 ? window.events.map((event, eventIndex) => (
                <span
                  key={`${event.label}-${eventIndex}`}
                  className={cn("rounded-4 border px-2 py-1 text-tiny text-body", toneClass(event.tone))}
                >
                  {event.label}
                </span>
              )) : <span className="text-tiny text-quiet">No events</span>}
            </div>
            {window.finalized && <p className="mt-2 text-tiny text-signal">Finalized and evicted</p>}
          </div>
        ))}
      </div>
      {watermark && (
        <div className="flex items-center gap-2 font-mono text-tiny text-warning">
          <span className="h-px flex-1 border-t border-dashed border-warning/50" aria-hidden />
          Watermark {watermark}
        </div>
      )}
    </div>
  );
}
