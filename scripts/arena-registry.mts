import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { createArenaRegistry } from "../src/lib/arena/catalog";

const outputPath = process.argv[2];
if (!outputPath) {
  console.error("usage: npm run arena:registry -- <output.json>");
  process.exitCode = 2;
} else {
  await writeRegistry(path.resolve(outputPath));
}

async function writeRegistry(destination: string): Promise<void> {
  const registry = await createArenaRegistry();
  const source = `${JSON.stringify(registry, null, 2)}\n`;
  const temporary = `${destination}.${process.pid}.tmp`;

  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(temporary, source, { encoding: "utf8", flag: "wx" });
  await rename(temporary, destination);
  console.log(
    `wrote ${registry.arenas.length} arena version(s) to ${destination}`,
  );
}
