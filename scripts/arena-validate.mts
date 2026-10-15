import path from "node:path";
import { readFile } from "node:fs/promises";

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
  if (
    loaded.manifest.metadata.visibility === "public" &&
    loaded.manifest.metadata.mode === "practice" &&
    (!loaded.manifest.submission.starter ||
      loaded.manifest.submission.starter === loaded.manifest.submission.entrypoint)
  ) {
    throw new Error(`Public practice arena ${id} requires a separate learner starter`);
  }
  if (loaded.manifest.submission.language === "go") {
    const harness = await readFile(path.join(loaded.arenaRoot, "harness/harness.go"), "utf8");
    const declaredVersion = harness.match(/\bArenaVersion\s*=\s*"([^"]+)"/)?.[1];
    if (declaredVersion !== version) {
      throw new Error(`Go harness ${id} reports ${declaredVersion ?? "no version"}, expected ${version}`);
    }
  }
  const statement = await loadArenaStatement(loaded.arenaRoot);
  console.log(`valid ${id}@${version} sha256:${loaded.digest}`);
  if (statement) console.log(`  statement: ${statement.length} blocks`);
}
