import { prisma } from "../../db/client.js";
import type { Env } from "../../config/env.js";
import { NotFoundError, RateLimitError } from "../../utils/errors.js";
import type { GitHubService } from "../github/github.service.js";
import type { EmbeddingService } from "../embeddings/embedding.service.js";
import { chunkText } from "./chunking.js";
import { isIndexablePath } from "./constants.js";
import { prioritizeIndexablePaths } from "./pathPriority.js";
import type { IngestionResult } from "./types.js";
import { VectorStore } from "./vector.store.js";

/**
 * Ingestion pipeline: GitHub files → text chunks → Gemini embeddings → pgvector.
 * Defaults are tuned for Gemini free tier (~35 embed calls per run).
 */
export class RagIngestionService {
  private vectorStore: VectorStore;

  constructor(
    private env: Env,
    private githubService: GitHubService,
    private embeddingService: EmbeddingService
  ) {
    this.vectorStore = new VectorStore(env.RAG_EMBEDDING_DIMENSION);
  }

  async indexRepository(repositoryId: string): Promise<IngestionResult> {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new NotFoundError("Repository not found");

    const branch = repo.defaultBranch || "main";
    const githubRepo = { owner: repo.owner, name: repo.name };

    const allPaths = await this.githubService.listRepositoryFilePaths(
      githubRepo,
      branch,
      this.env.RAG_MAX_INDEX_FILES * 3
    );

    const indexablePaths = prioritizeIndexablePaths(allPaths.filter(isIndexablePath)).slice(
      0,
      this.env.RAG_MAX_INDEX_FILES
    );

    await this.vectorStore.deleteRepositoryChunks(repositoryId);

    let filesProcessed = 0;
    let chunksStored = 0;
    let quotaLimited = false;
    const skippedPaths = allPaths.length - indexablePaths.length;
    const maxTotalChunks = this.env.RAG_MAX_TOTAL_CHUNKS;

    for (const path of indexablePaths) {
      if (chunksStored >= maxTotalChunks) {
        quotaLimited = true;
        break;
      }

      const raw = await this.githubService.getFileContent(githubRepo, path, branch);
      if (!raw?.trim()) continue;

      let chunks = chunkText(raw, this.env.RAG_CHUNK_SIZE, this.env.RAG_CHUNK_OVERLAP);
      if (chunks.length === 0) continue;

      const remaining = maxTotalChunks - chunksStored;
      chunks = chunks.slice(0, Math.min(chunks.length, this.env.RAG_MAX_CHUNKS_PER_FILE, remaining));
      if (chunks.length === 0) {
        quotaLimited = true;
        break;
      }

      const embedInputs = chunks.map(
        (c) => `File: ${path}\nRepository: ${repo.fullName}\nBranch: ${branch}\n\n${c.content}`
      );

      try {
        const embeddings = await this.embeddingService.embedTexts(embedInputs);

        if (embeddings.length < chunks.length) {
          quotaLimited = true;
          chunks = chunks.slice(0, embeddings.length);
        }

        for (let i = 0; i < chunks.length; i++) {
          await this.vectorStore.upsertChunk({
            repositoryId,
            path,
            chunkIndex: chunks[i].chunkIndex,
            content: chunks[i].content,
            branch,
            embedding: embeddings[i],
          });
          chunksStored += 1;
        }

        filesProcessed += 1;

        if (quotaLimited || chunksStored >= maxTotalChunks) {
          break;
        }
      } catch (error) {
        if (error instanceof RateLimitError) {
          quotaLimited = true;
          if (chunksStored === 0) throw error;
          break;
        }
        throw error;
      }
    }

    if (chunksStored > 0) {
      await prisma.repository.update({
        where: { id: repositoryId },
        data: { indexedAt: new Date(), indexBranch: branch },
      });
    }

    const message = quotaLimited
      ? `Indexed ${chunksStored} chunks (free-tier cap: ${maxTotalChunks} embed calls). ` +
        `Increase RAG_MAX_TOTAL_CHUNKS or use a paid API key for full repos.`
      : undefined;

    return {
      repositoryId,
      branch,
      filesProcessed,
      chunksStored,
      skippedPaths,
      quotaLimited: quotaLimited || undefined,
      message,
    };
  }
}
