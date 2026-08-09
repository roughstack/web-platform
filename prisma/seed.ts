import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { CHALLENGES } from "./seed/challenges";

// Mirrors prisma.config.ts: `.env.local` is the developer's file, `.env` the
// fallback for CI and container builds.
config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Without this the adapter falls back to libpq defaults and fails much later
  // with an opaque SASL error instead of naming the missing variable.
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local, or start the stack with `npm run docker:up`.",
  );
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/**
 * Seeds the challenge ladder.
 *
 * Every challenge is upserted by slug, so re-running is safe and picks up
 * edits to the content blocks without wiping submissions.
 */
async function main() {
  for (const challenge of CHALLENGES) {
    const { slug, ...fields } = challenge;

    const data = {
      ...fields,
      languages: fields.languages as never,
      difficulty: fields.difficulty as never,
      isPublished: true,
    };

    const saved = await prisma.challenge.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data },
      select: { slug: true, title: true, difficulty: true, tier: true },
    });

    console.log(
      `  ${saved.tier}. ${saved.title} (${saved.difficulty.toLowerCase()}) → /challenges/${saved.slug}`,
    );
  }

  // The old single challenge predates the ladder and its task name no longer
  // exists in the sprite registry, so leaving it published would offer a
  // challenge that cannot be graded.
  const retired = await prisma.challenge.updateMany({
    where: { slug: "ssd-ftl-gc" },
    data: { isPublished: false },
  });
  if (retired.count > 0) {
    console.log("  retired the pre-ladder challenge ssd-ftl-gc");
  }
}

main()
  .then(() => console.log("\nSeeded the SSD ladder."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
