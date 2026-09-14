import { readdir } from "node:fs/promises";
import path from "node:path";

import { loadArenaManifest, type LoadedArenaManifest } from "./manifest";

export const ARENA_ROOTS_ENV = "BYTEARENA_ARENA_ROOTS";

export function configuredArenaRoots(
  raw = process.env[ARENA_ROOTS_ENV],
  cwd = process.cwd(),
): string[] {
  const entries = raw?.split(path.delimiter).filter(Boolean) ?? ["arenas"];
  return [...new Set(entries.map((entry) => path.resolve(cwd, entry)))];
}

export async function discoverArenaManifests(
  roots = configuredArenaRoots(),
): Promise<LoadedArenaManifest[]> {
  const manifests: LoadedArenaManifest[] = [];

  for (const root of roots) {
    const entries = await readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const manifestPath = path.join(root, entry.name, "arena.yaml");
      const loaded = await loadArenaManifest(manifestPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (loaded) manifests.push(loaded);
    }
  }

  assertUniqueArenaVersions(manifests);
  return manifests.sort((a, b) => {
    const left = `${a.manifest.metadata.id}@${a.manifest.metadata.version}`;
    const right = `${b.manifest.metadata.id}@${b.manifest.metadata.version}`;
    return left.localeCompare(right);
  });
}

function assertUniqueArenaVersions(manifests: LoadedArenaManifest[]): void {
  const seen = new Map<string, string>();
  for (const loaded of manifests) {
    const key = `${loaded.manifest.metadata.id}@${loaded.manifest.metadata.version}`;
    const prior = seen.get(key);
    if (prior) {
      throw new Error(`duplicate arena version ${key}: ${prior} and ${loaded.manifestPath}`);
    }
    seen.set(key, loaded.manifestPath);
  }
}

