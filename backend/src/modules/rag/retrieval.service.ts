import type { Env } from "../../config/env.js";
import type { EmbeddingService } from "../embeddings/embedding.service.js";
import type { RetrievedCodeContext } from "./types.js";
import { VectorStore } from "./vector.store.js";

export interface PrRetrievalInput {
  repositoryId: string;
  title: string;
  body: string | null;
  changedFiles: Array<{
    filename: string;
    status: string;
    patch: string | null;
  }>;
  userQuery?: string;
}

export class RagRetrievalService {
  private vectorStore: VectorStore;

  constructor(
    private env: Env,
    private embeddingService: EmbeddingService,
  ) {
    this.vectorStore = new VectorStore(env.RAG_EMBEDDING_DIMENSION);
  }

  buildPrQueryText(input: PrRetrievalInput): string {
    const fileSummaries = input.changedFiles
      .map((f) => {
        const patchSnippet = f.patch ? f.patch.slice(0, 800) : "(no diff)";
        return `${f.filename} (${f.status}):\n${patchSnippet}`;
      })
      .join("\n\n");

    const questionBlock = input.userQuery?.trim()
      ? `\nUser question:\n${input.userQuery.trim()}\n`
      : "";

    return `Pull request: ${input.title}
Description: ${input.body ?? "(none)"}
${questionBlock}
Changed files and diffs:
${fileSummaries}`;
  }

  async retrieveRelatedContext(
    input: PrRetrievalInput,
  ): Promise<RetrievedCodeContext[]> {
    const chunkCount = await this.vectorStore.countChunks(input.repositoryId);
    if (chunkCount === 0) return [];

    const queryText = this.buildPrQueryText(input);
    const queryEmbedding = await this.embeddingService.embedText(queryText);
    const excludePaths = [
      ...new Set(input.changedFiles.map((f) => f.filename)),
    ];

    // Fetch extra chunks so deduplication by path still yields RAG_TOP_K distinct files.
    const results = await this.vectorStore.similaritySearch({
      repositoryId: input.repositoryId,
      queryEmbedding,
      limit: this.env.RAG_TOP_K * 8,
      excludePaths,
    });

    const byPath = new Map<string, RetrievedCodeContext>();
    for (const row of results) {
      const existing = byPath.get(row.path);
      if (!existing || row.similarity > existing.similarity) {
        byPath.set(row.path, row);
      }
    }

    return [...byPath.values()]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.env.RAG_TOP_K);
  }
}
