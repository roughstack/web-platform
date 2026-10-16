-- Bring the original migration baseline to the current application schema.
-- The data conversions are deliberately explicit: existing challenges and
-- submissions must survive an upgrade from the original public schema.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Difficulty' AND e.enumlabel = 'BEGINNER'
  ) THEN
    CREATE TYPE "Difficulty_next" AS ENUM ('EASY', 'MEDIUM', 'HARD');
    ALTER TABLE "Challenge" ALTER COLUMN "difficulty" TYPE "Difficulty_next"
      USING (CASE "difficulty"::text
        WHEN 'BEGINNER' THEN 'EASY'
        WHEN 'INTERMEDIATE' THEN 'MEDIUM'
        ELSE 'HARD'
      END)::"Difficulty_next";
    ALTER TYPE "Difficulty" RENAME TO "Difficulty_old";
    ALTER TYPE "Difficulty_next" RENAME TO "Difficulty";
    DROP TYPE "Difficulty_old";
  END IF;
END $$;

ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'C';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'CPP';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'JAVA';
ALTER TYPE "Language" ADD VALUE IF NOT EXISTS 'RUST';

ALTER TABLE "Challenge"
  ADD COLUMN IF NOT EXISTS "blocks" JSONB,
  ADD COLUMN IF NOT EXISTS "ladder" TEXT,
  ADD COLUMN IF NOT EXISTS "pack" TEXT NOT NULL DEFAULT 'ssd',
  ADD COLUMN IF NOT EXISTS "task" TEXT,
  ADD COLUMN IF NOT EXISTS "taskParams" JSONB,
  ADD COLUMN IF NOT EXISTS "tier" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Challenge'
      AND column_name = 'description'
  ) THEN
    EXECUTE 'UPDATE "Challenge" SET "blocks" = jsonb_build_array('
      || 'jsonb_build_object(''kind'', ''prose'', ''md'', "description")) '
      || 'WHERE "blocks" IS NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Challenge'
      AND column_name = 'interfaceDoc'
  ) THEN
    EXECUTE 'UPDATE "Challenge" SET "blocks" = "blocks" || '
      || 'jsonb_build_array(jsonb_build_object(''kind'', ''callout'', '
      || '''tone'', ''note'', ''title'', ''Interface'', ''md'', "interfaceDoc")) '
      || 'WHERE "interfaceDoc" IS NOT NULL AND "blocks" IS NOT NULL';
  END IF;
END $$;

-- Earlier challenges used their slug as the execution task. Keep the slug as
-- a conservative ladder key until an editor assigns a richer progression.
UPDATE "Challenge" SET "task" = "slug" WHERE "task" IS NULL;
UPDATE "Challenge" SET "ladder" = "slug" WHERE "ladder" IS NULL;
ALTER TABLE "Challenge"
  ALTER COLUMN "blocks" SET NOT NULL,
  ALTER COLUMN "task" SET NOT NULL,
  ALTER COLUMN "ladder" SET NOT NULL,
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "interfaceDoc";

ALTER TABLE "Submission" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;

CREATE TABLE IF NOT EXISTS "Reply" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "authorLabel" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
  "isHidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reply_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Challenge_ladder_tier_idx" ON "Challenge"("ladder", "tier");
CREATE INDEX IF NOT EXISTS "Submission_sessionId_createdAt_idx" ON "Submission"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reply_challengeId_createdAt_idx" ON "Reply"("challengeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Reply_sessionId_createdAt_idx" ON "Reply"("sessionId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reply_challengeId_fkey') THEN
    ALTER TABLE "Reply" ADD CONSTRAINT "Reply_challengeId_fkey"
      FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
