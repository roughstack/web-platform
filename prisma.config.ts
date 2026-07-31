import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads `.env.local` automatically, but the Prisma CLI does not, so it is
// loaded explicitly here. `.env` is kept as a fallback for CI and container builds.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Accessed via process.env rather than the `env()` helper so that commands which
    // do not touch the database, such as `prisma generate` during a type-check in CI,
    // do not fail merely because DATABASE_URL is absent.
    url: process.env.DATABASE_URL ?? "",
  },
});
