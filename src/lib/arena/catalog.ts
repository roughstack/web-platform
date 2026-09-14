import { readFile } from "node:fs/promises";

import { z } from "zod";

import { discoverArenaManifests } from "./discovery";
import { arenaManifestV1Schema, type ArenaManifestV1 } from "./manifest";

export const ARENA_REGISTRY_ENV = "BYTEARENA_ARENA_REGISTRY";

const manifestDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);

const arenaCatalogEntrySchema = z
  .object({
    manifest: arenaManifestV1Schema,
    manifestDigest: manifestDigestSchema,
  })
  .strict();

const arenaRegistryV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    arenas: z.array(arenaCatalogEntrySchema),
  })
  .strict();

export type ArenaCatalogEntry = z.infer<typeof arenaCatalogEntrySchema>;
export type ArenaRegistryV1 = z.infer<typeof arenaRegistryV1Schema>;

export interface ArenaCatalogOptions {
  environment?: string;
  registryPath?: string;
  roots?: string[];
}

export async function loadArenaCatalog(
  options: ArenaCatalogOptions = {},
): Promise<ArenaCatalogEntry[]> {
  const entries =
    (options.environment ?? process.env.NODE_ENV) === "production"
      ? await loadPublishedRegistry(
          options.registryPath ?? process.env[ARENA_REGISTRY_ENV],
        )
      : (await createArenaRegistry(options.roots)).arenas;

  return normalizeEntries(entries);
}

export async function createArenaRegistry(
  roots?: string[],
): Promise<ArenaRegistryV1> {
  const arenas = (await discoverArenaManifests(roots)).map(
    ({ manifest, digest }) => ({ manifest, manifestDigest: digest }),
  );
  return { schemaVersion: 1, arenas: normalizeEntries(arenas) };
}

async function loadPublishedRegistry(
  registryPath: string | undefined,
): Promise<ArenaCatalogEntry[]> {
  if (!registryPath) {
    throw new Error(`${ARENA_REGISTRY_ENV} is required in production`);
  }

  const source = await readFile(registryPath, "utf8");
  const parsed: unknown = JSON.parse(source);
  return arenaRegistryV1Schema.parse(parsed).arenas;
}

function isPublicArena(entry: ArenaCatalogEntry): boolean {
  return entry.manifest.metadata.visibility === "public";
}

function normalizeEntries(entries: ArenaCatalogEntry[]): ArenaCatalogEntry[] {
  assertUniqueArenaVersions(entries);
  return entries.filter(isPublicArena).sort(compareArenaEntries);
}

function assertUniqueArenaVersions(entries: ArenaCatalogEntry[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = arenaKey(entry.manifest);
    if (seen.has(key)) {
      throw new Error(`duplicate arena version ${key}`);
    }
    seen.add(key);
  }
}

function compareArenaEntries(
  left: ArenaCatalogEntry,
  right: ArenaCatalogEntry,
): number {
  const leftKey = arenaKey(left.manifest);
  const rightKey = arenaKey(right.manifest);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function arenaKey(manifest: ArenaManifestV1): string {
  return `${manifest.metadata.id}@${manifest.metadata.version}`;
}
