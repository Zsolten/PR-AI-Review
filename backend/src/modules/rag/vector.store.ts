import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import type { RetrievedCodeContext } from "./types.js";

export function toPgVectorLiteral(values: number[]): string {
  return `[${values.map((v) => (Number.isFinite(v) ? v : 0)).join(",")}]`;
}

/** SQL layer for pgvector insert, delete, and similarity search. */
export class VectorStore {
  constructor(private embeddingDimension: number) {}

  async deleteRepositoryChunks(repositoryId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM "RepositoryFile" WHERE "repositoryId" = ${repositoryId}
    `;
  }

  async upsertChunk(input: {
    repositoryId: string;
    path: string;
    chunkIndex: number;
    content: string;
    branch: string;
    embedding: number[];
  }): Promise<void> {
    if (input.embedding.length !== this.embeddingDimension) {
      throw new Error(
        `Embedding dimension ${input.embedding.length} does not match expected ${this.embeddingDimension}`
      );
    }

    const id = randomUUID();
    const vector = toPgVectorLiteral(input.embedding);
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO "RepositoryFile" (
        "id", "repositoryId", "path", "chunkIndex", "content", "branch", "embedding", "createdAt", "updatedAt"
      ) VALUES (
        ${id},
        ${input.repositoryId},
        ${input.path},
        ${input.chunkIndex},
        ${input.content},
        ${input.branch},
        ${vector}::vector,
        ${now},
        ${now}
      )
      ON CONFLICT ("repositoryId", "path", "chunkIndex")
      DO UPDATE SET
        "content" = EXCLUDED."content",
        "branch" = EXCLUDED."branch",
        "embedding" = EXCLUDED."embedding",
        "updatedAt" = EXCLUDED."updatedAt"
    `;
  }

  async similaritySearch(input: {
    repositoryId: string;
    queryEmbedding: number[];
    limit: number;
    excludePaths?: string[];
  }): Promise<RetrievedCodeContext[]> {
    const vector = toPgVectorLiteral(input.queryEmbedding);
    const exclude = input.excludePaths ?? [];

    if (exclude.length === 0) {
      const rows = await prisma.$queryRaw<
        Array<{ path: string; content: string; chunkIndex: number; similarity: number }>
      >`
        SELECT
          "path",
          "content",
          "chunkIndex",
          1 - ("embedding" <=> ${vector}::vector) AS similarity
        FROM "RepositoryFile"
        WHERE "repositoryId" = ${input.repositoryId}
          AND "embedding" IS NOT NULL
        ORDER BY "embedding" <=> ${vector}::vector
        LIMIT ${input.limit}
      `;
      return rows.map((r) => ({
        path: r.path,
        content: r.content,
        chunkIndex: r.chunkIndex,
        similarity: Number(r.similarity),
      }));
    }

    const rows = await prisma.$queryRaw<
      Array<{ path: string; content: string; chunkIndex: number; similarity: number }>
    >`
      SELECT
        "path",
        "content",
        "chunkIndex",
        1 - ("embedding" <=> ${vector}::vector) AS similarity
      FROM "RepositoryFile"
      WHERE "repositoryId" = ${input.repositoryId}
        AND "embedding" IS NOT NULL
        AND "path" NOT IN (${Prisma.join(exclude)})
      ORDER BY "embedding" <=> ${vector}::vector
      LIMIT ${input.limit}
    `;

    return rows.map((r) => ({
      path: r.path,
      content: r.content,
      chunkIndex: r.chunkIndex,
      similarity: Number(r.similarity),
    }));
  }

  async countChunks(repositoryId: string): Promise<number> {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM "RepositoryFile" WHERE "repositoryId" = ${repositoryId}
    `;
    return Number(result[0]?.count ?? 0);
  }
}
