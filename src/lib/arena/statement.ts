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
const figureBlock = z.object({
  kind: z.literal("figure"),
  illustration: z.object({
    id: z.enum(["systems.flow", "systems.state", "systems.timeline"]),
    props: z.record(z.string(), z.unknown()).optional(),
  }).strict(),
  caption: z.string().trim().min(1).max(1_000).optional(),
  label: z.string().trim().min(1).max(40).optional(),
}).strict();
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
