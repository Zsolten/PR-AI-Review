-- Enable pgvector (requires pgvector/pgvector Postgres image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Repository indexing metadata
ALTER TABLE "Repository" ADD COLUMN IF NOT EXISTS "indexedAt" TIMESTAMP(3);
ALTER TABLE "Repository" ADD COLUMN IF NOT EXISTS "indexBranch" TEXT;

-- Codebase memory chunks with embeddings
CREATE TABLE IF NOT EXISTS "RepositoryFile" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RepositoryFile_repositoryId_path_chunkIndex_key"
  ON "RepositoryFile"("repositoryId", "path", "chunkIndex");

CREATE INDEX IF NOT EXISTS "RepositoryFile_repositoryId_idx" ON "RepositoryFile"("repositoryId");

CREATE INDEX IF NOT EXISTS "repository_file_embedding_hnsw_idx"
  ON "RepositoryFile" USING hnsw ("embedding" vector_cosine_ops);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RepositoryFile_repositoryId_fkey'
  ) THEN
    ALTER TABLE "RepositoryFile"
      ADD CONSTRAINT "RepositoryFile_repositoryId_fkey"
      FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
