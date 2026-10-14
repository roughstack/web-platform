import { ArrowLeft, ArrowRight, Clock3, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "signal" | "warning" | "danger" | "neutral";

const TONE_STYLES: Record<Tone, string> = {
  accent: "border-accent/45 bg-accent/15 text-ink",
  signal: "border-signal/45 bg-signal/15 text-ink",
  warning: "border-warning/45 bg-warning/15 text-ink",
  danger: "border-danger/45 bg-danger/15 text-ink",
  neutral: "border-edge-strong bg-raised/50 text-body",
};

const BAR_STYLES: Record<Tone, string> = {
  accent: "bg-accent/75",
  signal: "bg-signal/75",
  warning: "bg-warning/75",
  danger: "bg-danger/75",
  neutral: "bg-edge-strong",
};

interface Cell {
  label: string;
  detail?: string;
  tone: Tone;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function string(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tone(value: unknown): Tone {
  return typeof value === "string" && value in TONE_STYLES ? value as Tone : "neutral";
}

function cells(value: unknown): Cell[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const data = record(item);
    if (!data || !string(data.label)) return [];
    return [{ label: string(data.label), detail: string(data.detail) || undefined, tone: tone(data.tone) }];
  });
}

function fallback() {
  return <p className="text-mini text-quiet">Diagram data is unavailable.</p>;
}

function DiagramHeading({ title, detail }: { title?: string; detail?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span className="text-micro font-semibold uppercase tracking-[0.12em] text-muted">{title}</span>
      {detail && <span className="font-mono text-tiny text-quiet">{detail}</span>}
    </div>
  );
}

/** A sequence of concrete states, useful for cache and queue transitions. */
export function SnapshotDiagram({ title, rows: rawRows }: { title?: string; rows?: unknown }) {
  const rows = Array.isArray(rawRows) ? rawRows.flatMap((entry) => {
    const data = record(entry);
    if (!data || !string(data.label)) return [];
    return [{ label: string(data.label), note: string(data.note), cells: cells(data.cells) }];
  }) : [];
  if (rows.length < 2 || rows.some((row) => row.cells.length === 0)) return fallback();

  return (
    <div role="img" aria-label={`${title ?? "State changes"}. ${rows.map((row) => `${row.label}: ${row.cells.map((cell) => `${cell.label}${cell.detail ? ` ${cell.detail}` : ""}`).join(", ")}${row.note ? `. ${row.note}` : ""}`).join(". ")}`} className="space-y-3">
      <DiagramHeading title={title ?? "State changes"} detail="read top to bottom" />
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="grid gap-2 border-t border-edge pt-2.5 sm:grid-cols-[6.5rem_1fr] sm:items-center">
          <div className="flex items-baseline gap-2 sm:block">
            <span className="font-mono text-tiny text-quiet">{String(index + 1).padStart(2, "0")}</span>
            <span className="text-mini font-medium text-body sm:ml-1">{row.label}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              {row.cells.map((cell, cellIndex) => (
                <div key={`${cell.label}-${cellIndex}`} className={cn("min-w-12 rounded-6 border px-2.5 py-1.5", TONE_STYLES[cell.tone])}>
                  <span className="font-mono text-mini font-medium">{cell.label}</span>
                  {cell.detail && <span className="ml-1.5 text-tiny opacity-80">{cell.detail}</span>}
                </div>
              ))}
            </div>
            {row.note && <p className="mt-1.5 text-micro text-muted">{row.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Proportional capacity snapshots for memory budgets and token buckets. */
export function BudgetDiagram({ title, capacity, snapshots: rawSnapshots }: {
  title?: string;
  capacity?: number;
  snapshots?: unknown;
}) {
  const limit = typeof capacity === "number" && Number.isFinite(capacity) && capacity > 0 ? capacity : 0;
  const snapshots = Array.isArray(rawSnapshots) ? rawSnapshots.flatMap((entry) => {
    const data = record(entry);
    if (!data || !string(data.label)) return [];
    const segments = Array.isArray(data.segments) ? data.segments.flatMap((item) => {
      const segment = record(item);
      if (!segment || !string(segment.label) || typeof segment.value !== "number" || !Number.isFinite(segment.value) || segment.value < 0) return [];
      return [{ label: string(segment.label), value: segment.value, tone: tone(segment.tone) }];
    }) : [];
    return [{ label: string(data.label), note: string(data.note), segments }];
  }) : [];
  if (!limit || snapshots.length < 2 || snapshots.some((item) => item.segments.reduce((sum, segment) => sum + segment.value, 0) > limit)) return fallback();

  return (
    <div role="img" aria-label={`${title ?? "Capacity over time"}. Capacity ${limit}. ${snapshots.map((snapshot) => `${snapshot.label}: ${snapshot.segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`).join(". ")}`} className="space-y-3.5">
      <DiagramHeading title={title ?? "Capacity over time"} detail={`capacity ${limit}`} />
      {snapshots.map((snapshot, index) => {
        const used = snapshot.segments.reduce((sum, segment) => sum + segment.value, 0);
        return (
          <div key={`${snapshot.label}-${index}`} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-mini">
              <span className="font-medium text-body">{snapshot.label}</span>
              <span className="font-mono text-tiny tabular-nums text-muted">{used} / {limit}</span>
            </div>
            <div className="flex h-5 overflow-hidden rounded-5 border border-edge bg-canvas-deep">
              {snapshot.segments.map((segment, segmentIndex) => (
                <div key={`${segment.label}-${segmentIndex}`} className={cn("h-full", BAR_STYLES[segment.tone])} style={{ width: `${segment.value / limit * 100}%` }} title={`${segment.label}: ${segment.value}`} />
              ))}
            </div>
            <p className="text-micro text-muted">
              {snapshot.segments.map((segment) => `${segment.label} ${segment.value}`).join(" · ")}
              {snapshot.note && ` · ${snapshot.note}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/** A framed byte layout with per-frame status and independently colored fields. */
export function FrameDiagram({ title, frames: rawFrames, note }: { title?: string; frames?: unknown; note?: string }) {
  const frames = Array.isArray(rawFrames) ? rawFrames.flatMap((entry) => {
    const data = record(entry);
    if (!data || !string(data.label)) return [];
    return [{ label: string(data.label), status: string(data.status), note: string(data.note), tone: tone(data.tone), fields: cells(data.fields) }];
  }) : [];
  if (frames.length < 2 || frames.some((frame) => frame.fields.length === 0)) return fallback();

  return (
    <div role="img" aria-label={`${title ?? "Byte layout"}. ${frames.map((frame) => `${frame.label}${frame.status ? ` ${frame.status}` : ""}: ${frame.fields.map((field) => field.label).join(", ")}`).join(". ")}`} className="space-y-3">
      <DiagramHeading title={title ?? "Byte layout"} detail={note} />
      {frames.map((frame, index) => (
        <div key={`${frame.label}-${index}`} className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-mini text-ink">{frame.label}</span>
            {frame.status && <span className={cn("rounded-full border px-2 py-0.5 text-tiny", TONE_STYLES[frame.tone])}>{frame.status}</span>}
          </div>
          <div className="flex min-h-10 overflow-hidden rounded-6 border border-edge">
            {frame.fields.map((field, fieldIndex) => (
              <div key={`${field.label}-${fieldIndex}`} className={cn("flex min-w-0 flex-1 flex-col justify-center border-r border-edge px-2 py-1 last:border-r-0", TONE_STYLES[field.tone])}>
                <span className="truncate font-mono text-tiny font-medium">{field.label}</span>
                {field.detail && <span className="truncate text-[10px] opacity-75">{field.detail}</span>}
              </div>
            ))}
          </div>
          {frame.note && <p className="text-micro text-muted">{frame.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** A shared numeric axis makes waits, overlaps, and watermark boundaries visible. */
export function RangeDiagram({ title, min, max, rows: rawRows, markers: rawMarkers }: {
  title?: string;
  min?: number;
  max?: number;
  rows?: unknown;
  markers?: unknown;
}) {
  const start = typeof min === "number" && Number.isFinite(min) ? min : 0;
  const end = typeof max === "number" && Number.isFinite(max) ? max : 0;
  const rows = Array.isArray(rawRows) ? rawRows.flatMap((entry) => {
    const data = record(entry);
    if (!data || !string(data.label) || typeof data.start !== "number" || typeof data.end !== "number") return [];
    return [{ label: string(data.label), start: data.start, end: data.end, note: string(data.note), tone: tone(data.tone) }];
  }) : [];
  const markers = Array.isArray(rawMarkers) ? rawMarkers.flatMap((entry) => {
    const data = record(entry);
    if (!data || typeof data.at !== "number" || !string(data.label)) return [];
    return [{ at: data.at, label: string(data.label), tone: tone(data.tone) }];
  }) : [];
  if (end <= start || rows.length < 2 || rows.some((row) => row.start < start || row.end > end || row.end <= row.start)) return fallback();
  const percent = (value: number) => `${(value - start) / (end - start) * 100}%`;

  return (
    <div role="img" aria-label={`${title ?? "Shared axis"}. ${rows.map((row) => `${row.label} spans ${row.start} to ${row.end}${row.note ? `. ${row.note}` : ""}`).join(". ")}. ${markers.map((marker) => `${marker.label} at ${marker.at}`).join(". ")}`} className="space-y-2.5">
      <DiagramHeading title={title ?? "Shared axis"} detail={`${start} → ${end}`} />
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="grid gap-1.5 sm:grid-cols-[5.5rem_1fr] sm:items-center">
          <span className="font-mono text-tiny text-body">{row.label}</span>
          <div className="min-w-0">
            <div className="relative h-7 rounded-5 border border-edge bg-canvas-deep">
              <div className={cn("absolute bottom-1 top-1 rounded-4", BAR_STYLES[row.tone])} style={{ left: percent(row.start), width: `${(row.end - row.start) / (end - start) * 100}%` }} title={`${row.label}: ${row.start} to ${row.end}`} />
              {markers.map((marker, markerIndex) => (
                <div key={`${marker.label}-${markerIndex}`} className="absolute bottom-0 top-0 border-l border-dashed border-ink/70" style={{ left: percent(marker.at) }} />
              ))}
            </div>
            {row.note && <p className="mt-1 text-micro text-muted">{row.note}</p>}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-quiet">
        <span className="font-mono">{start}</span>
        {markers.map((marker, index) => <span key={`${marker.label}-${index}`} className="font-mono">{marker.label} {marker.at}</span>)}
        <span className="font-mono">{end}</span>
      </div>
    </div>
  );
}

/** A packet trace where lost messages and local timer events remain visible. */
export function ExchangeDiagram({ title, left, right, events: rawEvents }: {
  title?: string;
  left?: string;
  right?: string;
  events?: unknown;
}) {
  const events = Array.isArray(rawEvents) ? rawEvents.flatMap((entry) => {
    const data = record(entry);
    if (!data || !string(data.label) || !["left", "right", "local"].includes(string(data.from))) return [];
    return [{ label: string(data.label), detail: string(data.detail), from: string(data.from), dropped: data.dropped === true, tone: tone(data.tone) }];
  }) : [];
  if (events.length < 2) return fallback();

  return (
    <div role="img" aria-label={`${title ?? `${left ?? "Sender"} and ${right ?? "Receiver"} packet trace`}. ${events.map((event) => `${event.from === "left" ? left ?? "Sender" : event.from === "right" ? right ?? "Receiver" : "Local timer"}: ${event.label}${event.dropped ? " lost" : ""}${event.detail ? `. ${event.detail}` : ""}`).join(". ")}`} className="space-y-2">
      <DiagramHeading title={title ?? "Message trace"} detail="virtual time ↓" />
      <div className="grid grid-cols-[1fr_4rem_1fr] gap-2 border-b border-edge pb-2 text-micro font-medium text-muted">
        <span>{left ?? "Sender"}</span><span /><span className="text-right">{right ?? "Receiver"}</span>
      </div>
      {events.map((event, index) => (
        <div key={`${event.label}-${index}`} className="grid grid-cols-[1fr_4rem_1fr] items-center gap-2">
          {event.from === "local" ? (
            <><div className="rounded-6 border border-warning/45 bg-warning/10 px-2 py-1.5 text-mini text-body"><Clock3 className="mr-1 inline size-3 text-warning" aria-hidden />{event.label}</div><div /><div /></>
          ) : (
            <>
              <div className={cn("min-w-0 rounded-6 border px-2 py-1.5 text-mini", TONE_STYLES[event.tone], event.from === "right" && "opacity-50")}>{event.from === "left" ? event.label : event.detail}</div>
              <div className={cn("flex justify-center", event.dropped && "text-danger", !event.dropped && "text-muted")}>
                {event.dropped ? <X className="size-4" aria-hidden /> : event.from === "left" ? <ArrowRight className="size-4" aria-hidden /> : <ArrowLeft className="size-4" aria-hidden />}
              </div>
              <div className={cn("min-w-0 rounded-6 border px-2 py-1.5 text-right text-mini", TONE_STYLES[event.tone], event.from === "left" && "opacity-50")}>{event.from === "right" ? event.label : event.dropped ? "lost" : event.detail}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
