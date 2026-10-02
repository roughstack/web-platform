import type { LadderRung } from "@/components/arena/arena";
import type { MetricDef } from "@/components/arena/types";

import type { ArenaCatalogEntry } from "./catalog";
import type { ArenaManifestV1 } from "./manifest";
import type { ContentBlock } from "@/lib/blocks/types";

const DIFFICULTY_SUFFIX = /\s*(?:—|–|-|:)\s*(?:easy|medium|hard)\s*$/i;
const ID_DIFFICULTY_SUFFIX = /-(?:easy|medium|hard)$/;

export function cleanArenaTitle(title: string): string {
  return title.replace(DIFFICULTY_SUFFIX, "").trim();
}

export function arenaFamilyId(id: string): string {
  return id.replace(ID_DIFFICULTY_SUFFIX, "");
}

export function arenaTier(
  difficulty: ArenaManifestV1["metadata"]["difficulty"],
): number {
  if (difficulty === "hard") return 3;
  if (difficulty === "medium") return 2;
  return 1;
}

export function buildArenaLadder(
  entries: readonly ArenaCatalogEntry[],
  family: string,
): LadderRung[] {
  return entries
    .filter(
      (entry) =>
        arenaFamilyId(entry.manifest.metadata.id) === family &&
        entry.manifest.metadata.difficulty !== undefined,
    )
    .map(({ manifest }) => ({
      slug: manifest.metadata.id,
      title: cleanArenaTitle(manifest.metadata.title),
      difficulty: manifest.metadata.difficulty!.toUpperCase() as LadderRung["difficulty"],
      tier: arenaTier(manifest.metadata.difficulty),
    }))
    .sort((left, right) => left.tier - right.tier || left.slug.localeCompare(right.slug));
}

export function arenaMetricDefs(manifest: ArenaManifestV1): MetricDef[] {
  return manifest.metrics.map((metric) => ({
    key: metric.id,
    label: humanizeIdentifier(metric.id),
    unit: metric.unit,
    description: `${humanizeIdentifier(metric.id)} (${metric.direction}).`,
    lowerIsBetter: metric.direction === "minimize",
    weight: metric.weight ?? 1,
  }));
}

export function humanizeIdentifier(value: string): string {
  const words = value.replaceAll("_", " ").replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function readmeSummary(readme: string): string {
  const withoutHeading = readme.replace(/^#\s+.*(?:\r?\n)+/, "");
  const firstSection = withoutHeading.split(/^##\s+/m)[0] ?? "";
  return firstSection.replace(/\s+/g, " ").trim();
}

export function arenaReadmeBlocks(readme: string): ContentBlock[] {
  const body = readme.replace(/^#\s+.*(?:\r?\n)+/, "").trim();
  const sections = body
    .split(/(?=^##\s+)/m)
    .map((section) => section.trim())
    .filter((section) => section.length > 0)
    .filter((section) => !section.startsWith("## Verify"));

  return [
    {
      kind: "callout",
      tone: "insight",
      title: "A good way in",
      md: "Read the scenario first, then trace the contract with one small example before optimizing. Correctness is the gate; the metrics tell you where to improve after your first passing run.",
    },
    ...sections.map((md): ContentBlock => ({ kind: "prose", md })),
  ];
}
