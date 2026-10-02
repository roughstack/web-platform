import path from "node:path";

import { configuredArenaRoots, discoverArenaManifests } from "../src/lib/arena/discovery";
import { loadArenaManifest } from "../src/lib/arena/manifest";
import { loadArenaStatement } from "../src/lib/arena/statement";

const args = process.argv.slice(2);

const manifests = args.includes("--all")
  ? await discoverArenaManifests(configuredArenaRoots())
  : await Promise.all(
      args.map((target) =>
        loadArenaManifest(
          path.basename(target) === "arena.yaml" ? target : path.join(target, "arena.yaml"),
        ),
      ),
    );

if (manifests.length === 0) {
  throw new Error("No arenas found. Pass arena directories or configure BYTEARENA_ARENA_ROOTS.");
}

for (const loaded of manifests) {
  const { id, version } = loaded.manifest.metadata;
  const statement = await loadArenaStatement(loaded.arenaRoot);
  console.log(`valid ${id}@${version} sha256:${loaded.digest}`);
  if (statement) console.log(`  statement: ${statement.length} blocks`);
}
