import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { ContentBlock } from "@/lib/blocks/types";

import { loadArenaCatalog, type ArenaCatalogEntry } from "./catalog";
import { discoverArenaManifests } from "./discovery";
import type { LoadedArenaManifest } from "./manifest";
import {
  arenaFamilyId,
  arenaMetricDefs,
  arenaReadmeBlocks,
  arenaTier,
  cleanArenaTitle,
  humanizeIdentifier,
  readmeSummary,
} from "./presentation";
import { loadArenaStatement } from "./statement";

export const ARENA_TASK_PREFIX = "arena:";

export interface ArenaChallengeSource {
  readonly entry: ArenaCatalogEntry;
  readonly loaded: LoadedArenaManifest;
  readonly readme: string;
  readonly starterCode: string;
  readonly blocks: readonly ContentBlock[];
}

export interface ArenaChallengeCard {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly difficulty: "EASY" | "MEDIUM" | "HARD";
  readonly category: string;
  readonly languages: readonly ["GO"];
  readonly timeLimitSec: number;
  readonly memoryLimitMb: number;
}

export async function loadArenaChallengeCards(): Promise<ArenaChallengeCard[]> {
  const [catalog, discovered] = await Promise.all([
    loadArenaCatalog(),
    discoverArenaManifests(),
  ]);
  const packages = new Map(
    discovered.map((loaded) => [
      `${loaded.manifest.metadata.id}@${loaded.digest}`,
      loaded,
    ]),
  );

  return Promise.all(
    catalog.flatMap((entry) => {
      const difficulty = entry.manifest.metadata.difficulty?.toUpperCase();
      if (difficulty !== "EASY" && difficulty !== "MEDIUM" && difficulty !== "HARD") {
        return [];
      }
      const loaded = packages.get(
        `${entry.manifest.metadata.id}@${entry.manifestDigest}`,
      );

      return [
        (async (): Promise<ArenaChallengeCard> => {
          const readme = loaded
            ? await readFile(path.join(loaded.arenaRoot, "README.md"), "utf8")
            : "";
          return {
            slug: entry.manifest.metadata.id,
            title: cleanArenaTitle(entry.manifest.metadata.title),
            summary:
              readmeSummary(readme) ||
              `Implement the ${humanizeIdentifier(entry.manifest.metadata.id)} system contract.`,
            difficulty,
            category: humanizeIdentifier(
              entry.manifest.metadata.tags[0] ?? "systems",
            ),
            languages: ["GO"],
            timeLimitSec: entry.manifest.run.timeoutSeconds,
            memoryLimitMb: entry.manifest.resources.memoryMiB,
          };
        })(),
      ];
    }),
  );
}

export async function loadArenaChallengeSource(
  id: string,
): Promise<ArenaChallengeSource | null> {
  const catalog = await loadArenaCatalog();
  const entry = catalog.find((candidate) => candidate.manifest.metadata.id === id);
  if (!entry) return null;

  const loaded = (await discoverArenaManifests()).find(
    (candidate) =>
      candidate.manifest.metadata.id === id && candidate.digest === entry.manifestDigest,
  );
  if (!loaded) {
    throw new Error(
      `Arena package ${id}@${entry.manifest.metadata.version} is not available locally`,
    );
  }

  const [readme, starterCode, statement] = await Promise.all([
    readFile(path.join(loaded.arenaRoot, "README.md"), "utf8"),
    readFile(path.join(loaded.arenaRoot, entry.manifest.submission.entrypoint), "utf8"),
    loadArenaStatement(loaded.arenaRoot),
  ]);

  return {
    entry,
    loaded,
    readme,
    starterCode,
    blocks: statement ?? arenaReadmeBlocks(readme),
  };
}

export async function materializeArenaChallenge(id: string) {
  const source = await loadArenaChallengeSource(id);
  if (!source) return null;

  const { manifest } = source.entry;
  const difficulty = manifest.metadata.difficulty?.toUpperCase();
  if (difficulty !== "EASY" && difficulty !== "MEDIUM" && difficulty !== "HARD") {
    throw new Error(`Arena ${id} must declare a difficulty`);
  }

  const title = cleanArenaTitle(manifest.metadata.title);
  const summary = readmeSummary(source.readme);
  const metrics = arenaMetricDefs(manifest);
  const category = humanizeIdentifier(manifest.metadata.tags[0] ?? "systems");

  return prisma.challenge.upsert({
    where: { slug: id },
    create: {
      slug: id,
      title,
      summary,
      blocks: source.blocks as Prisma.InputJsonValue,
      difficulty,
      category,
      languages: ["GO"],
      pack: "arena",
      task: `${ARENA_TASK_PREFIX}${id}`,
      ladder: arenaFamilyId(id),
      tier: arenaTier(manifest.metadata.difficulty),
      starterCode: { GO: source.starterCode },
      taskParams: {
        arenaVersion: manifest.metadata.version,
        manifestDigest: source.entry.manifestDigest,
      },
      timeLimitSec: manifest.run.timeoutSeconds,
      memoryLimitMb: manifest.resources.memoryMiB,
      metricsConfig: { metrics } as unknown as Prisma.InputJsonValue,
      sortOrder: 100 + arenaTier(manifest.metadata.difficulty),
      isPublished: true,
    },
    update: {
      title,
      summary,
      blocks: source.blocks as Prisma.InputJsonValue,
      difficulty,
      category,
      languages: ["GO"],
      pack: "arena",
      task: `${ARENA_TASK_PREFIX}${id}`,
      ladder: arenaFamilyId(id),
      tier: arenaTier(manifest.metadata.difficulty),
      starterCode: { GO: source.starterCode },
      taskParams: {
        arenaVersion: manifest.metadata.version,
        manifestDigest: source.entry.manifestDigest,
      },
      timeLimitSec: manifest.run.timeoutSeconds,
      memoryLimitMb: manifest.resources.memoryMiB,
      metricsConfig: { metrics } as unknown as Prisma.InputJsonValue,
      isPublished: true,
    },
  });
}
