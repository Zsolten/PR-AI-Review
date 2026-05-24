-- GitHub repository IDs can exceed JS Number.MAX_SAFE_INTEGER; store as TEXT.
-- Safe when column is already TEXT (IF NOT EXISTS pattern via DO block).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Repository'
      AND column_name = 'githubId'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE "Repository" ALTER COLUMN "githubId" SET DATA TYPE TEXT USING "githubId"::TEXT;
  END IF;
END $$;
