export interface RetrievedCodeContext {
  path: string;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export interface IngestionResult {
  repositoryId: string;
  branch: string;
  filesProcessed: number;
  chunksStored: number;
  skippedPaths: number;
  /** True when stopped early due to Gemini 429 / quota. */
  quotaLimited?: boolean;
  message?: string;
}
