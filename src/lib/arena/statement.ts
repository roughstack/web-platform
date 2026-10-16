import { readFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import type { ContentBlock } from "@/lib/blocks/types";

const markdown = z.string().trim().min(1).max(12_000);
const shortText = z.string().trim().min(1).max(240);

const proseBlock = z.object({ kind: z.literal("prose"), md: markdown }).strict();
const calloutBlock = z.object({
  kind: z.literal("callout"),
  tone: z.enum(["note", "warn", "insight"]),
  title: shortText.optional(),
  md: markdown,
}).strict();
const diagramTone = z.enum(["accent", "signal", "warning", "danger", "neutral"]);
const diagramCell = z.object({ label: shortText, detail: shortText.optional(), tone: diagramTone.optional() }).strict();
const snapshotProps = z.object({
  title: shortText,
  rows: z.array(z.object({ label: shortText, note: shortText.optional(), cells: z.array(diagramCell).min(1) }).strict()).min(2),
}).strict();
const budgetProps = z.object({
  title: shortText,
  capacity: z.number().positive().finite(),
  snapshots: z.array(z.object({
    label: shortText,
    note: shortText.optional(),
    segments: z.array(z.object({ label: shortText, value: z.number().nonnegative().finite(), tone: diagramTone.optional() }).strict()).min(1),
  }).strict()).min(2),
}).strict().superRefine((props, ctx) => {
  for (const [index, snapshot] of props.snapshots.entries()) {
    if (snapshot.segments.reduce((sum, segment) => sum + segment.value, 0) > props.capacity) {
      ctx.addIssue({ code: "custom", message: "segments exceed capacity", path: ["snapshots", index] });
    }
  }
});
const frameProps = z.object({
  title: shortText,
  note: shortText.optional(),
  frames: z.array(z.object({ label: shortText, status: shortText.optional(), note: shortText.optional(), tone: diagramTone.optional(), fields: z.array(diagramCell).min(1) }).strict()).min(2),
}).strict();
const rangeProps = z.object({
  title: shortText,
  min: z.number().finite(),
  max: z.number().finite(),
  rows: z.array(z.object({ label: shortText, start: z.number().finite(), end: z.number().finite(), note: shortText.optional(), tone: diagramTone.optional() }).strict()).min(2),
  markers: z.array(z.object({ at: z.number().finite(), label: shortText, tone: diagramTone.optional() }).strict()).optional(),
}).strict().superRefine((props, ctx) => {
  if (props.max <= props.min) ctx.addIssue({ code: "custom", message: "max must exceed min" });
  for (const [index, row] of props.rows.entries()) {
    if (row.start < props.min || row.end > props.max || row.end <= row.start) {
      ctx.addIssue({ code: "custom", message: "range must fit the axis", path: ["rows", index] });
    }
  }
  for (const [index, marker] of (props.markers ?? []).entries()) {
    if (marker.at < props.min || marker.at > props.max) {
      ctx.addIssue({ code: "custom", message: "marker must fit the axis", path: ["markers", index] });
    }
  }
});
const exchangeProps = z.object({
  title: shortText,
  left: shortText,
  right: shortText,
  events: z.array(z.object({ from: z.enum(["left", "right", "local"]), label: shortText, detail: shortText.optional(), dropped: z.boolean().optional(), tone: diagramTone.optional() }).strict()).min(2),
}).strict();
const conceptFigureProps = {
  "systems.snapshot": snapshotProps,
  "systems.budget": budgetProps,
  "systems.frames": frameProps,
  "systems.ranges": rangeProps,
  "systems.exchange": exchangeProps,
  "systems.cache-story": z.object({ mode: z.enum(["lru", "scan"]) }).strict(),
  "systems.lost-ack-story": z.object({}).strict(),
} as const;

const figureBlock = z.object({
  kind: z.literal("figure"),
  illustration: z.object({
    id: z.enum([
      "systems.flow", "systems.state", "systems.timeline",
      "systems.snapshot", "systems.budget", "systems.frames",
      "systems.ranges", "systems.exchange",
      "systems.cache-story", "systems.lost-ack-story",
    ]),
    props: z.record(z.string(), z.unknown()).optional(),
  }).strict(),
  caption: z.string().trim().min(1).max(1_000).optional(),
  label: z.string().trim().min(1).max(40).optional(),
  presentation: z.literal("immersive").optional(),
}).strict().superRefine((figure, ctx) => {
  const schema = conceptFigureProps[figure.illustration.id as keyof typeof conceptFigureProps];
  if (schema && !schema.safeParse(figure.illustration.props).success) {
    ctx.addIssue({ code: "custom", message: `invalid props for ${figure.illustration.id}`, path: ["illustration", "props"] });
  }
});
const exampleBlock = z.object({
  kind: z.literal("example"),
  input: z.string().max(8_000),
  output: z.string().max(8_000),
  explain: markdown.optional(),
}).strict();
const codeBlock = z.object({
  kind: z.literal("code"),
  code: z.string().min(1).max(12_000),
  label: shortText.optional(),
  language: z.string().trim().min(1).max(30).optional(),
}).strict();
const constraintsBlock = z.object({
  kind: z.literal("constraints"),
  items: z.array(markdown.max(1_000)).min(1).max(16),
}).strict();
const stepsBlock = z.object({
  kind: z.literal("steps"),
  items: z.array(z.object({ title: shortText, md: markdown.max(2_000) }).strict()).min(1).max(12),
}).strict();

const arenaStatementSchema = z.object({
  version: z.literal(1),
  blocks: z.array(z.discriminatedUnion("kind", [
    proseBlock,
    calloutBlock,
    figureBlock,
    exampleBlock,
    codeBlock,
    constraintsBlock,
    stepsBlock,
  ])).min(1).max(40),
}).strict();

/** Parse the public, data-only educational statement contract. */
export function parseArenaStatement(source: string): ContentBlock[] {
  if (source.length > 256_000) throw new Error("Arena statement exceeds 256 KiB");
  return arenaStatementSchema.parse(JSON.parse(source)).blocks as ContentBlock[];
}

/** Load an optional statement.json, falling back only when it is absent. */
export async function loadArenaStatement(arenaRoot: string): Promise<ContentBlock[] | null> {
  try {
    const source = await readFile(path.join(arenaRoot, "statement.json"), "utf8");
    return parseArenaStatement(source);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
