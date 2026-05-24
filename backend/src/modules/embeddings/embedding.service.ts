import { TaskType } from "@google/generative-ai";
import type { Env } from "../../config/env.js";
import { BadRequestError, RateLimitError } from "../../utils/errors.js";

type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

interface EmbedApiResponse {
  embedding?: { values?: number[] };
}

interface EmbedApiError {
  error?: { message?: string };
}

/**
 * Gemini embeddings for RAG. Uses REST embedContent with retries and throttling
 * so free-tier API keys can index a small demo slice of a repo.
 */
export class EmbeddingService {
  constructor(private env: Env) {}

  private requireApiKey(): string {
    if (!this.env.GEMINI_API_KEY) {
      throw new BadRequestError(
        "Gemini API key is not configured. Set GEMINI_API_KEY for embeddings."
      );
    }
    return this.env.GEMINI_API_KEY;
  }

  private parseRetryAfterMs(response: Response): number | null {
    const header = response.headers.get("retry-after");
    if (!header) return null;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const dateMs = Date.parse(header);
    if (Number.isFinite(dateMs)) return Math.max(0, dateMs - Date.now());
    return null;
  }

  private async embedSingle(
    text: string,
    taskType: EmbeddingTaskType
  ): Promise<number[]> {
    const apiKey = this.requireApiKey();
    const model = this.env.GEMINI_EMBEDDING_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;
    const maxRetries = this.env.RAG_EMBED_MAX_RETRIES;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: this.env.RAG_EMBEDDING_DIMENSION,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as EmbedApiResponse;
        const values = data.embedding?.values;

        if (!values?.length) {
          throw new Error("Gemini returned an empty embedding");
        }

        if (values.length !== this.env.RAG_EMBEDDING_DIMENSION) {
          throw new Error(
            `Embedding dimension ${values.length} !== configured ${this.env.RAG_EMBEDDING_DIMENSION}`
          );
        }

        return values;
      }

      const errBody = await response.text().catch(() => "");
      const isRateLimit = response.status === 429;
      const canRetry = isRateLimit && attempt < maxRetries;

      if (canRetry) {
        const retryAfter = this.parseRetryAfterMs(response);
        const backoff = retryAfter ?? Math.min(60_000, 2000 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      if (isRateLimit) {
        let detail = "Gemini API quota or rate limit exceeded.";
        try {
          const parsed = JSON.parse(errBody) as EmbedApiError;
          if (parsed.error?.message) detail = parsed.error.message;
        } catch {
          /* use default */
        }
        throw new RateLimitError(
          `${detail} For free keys, lower RAG_MAX_INDEX_FILES / RAG_MAX_TOTAL_CHUNKS in .env or wait and retry.`
        );
      }

      throw new Error(
        `Gemini embedContent failed (${response.status}): ${errBody.slice(0, 300)}`
      );
    }

    throw new Error("Gemini embedContent failed after retries");
  }

  async embedTextForDocument(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Cannot embed empty text");
    return this.embedSingle(trimmed.slice(0, 8000), TaskType.RETRIEVAL_DOCUMENT);
  }

  async embedTextForQuery(text: string): Promise<number[]> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error("Cannot embed empty text");
    return this.embedSingle(trimmed.slice(0, 8000), TaskType.RETRIEVAL_QUERY);
  }

  /**
   * Embeds texts sequentially with delay between calls. Stops early on rate limit
   * and returns partial results so ingestion can save what completed.
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    const delayMs = this.env.RAG_EMBED_DELAY_MS;

    for (let i = 0; i < texts.length; i++) {
      try {
        embeddings.push(await this.embedTextForDocument(texts[i]));
      } catch (error) {
        if (error instanceof RateLimitError && embeddings.length > 0) {
          return embeddings;
        }
        throw error;
      }

      if (delayMs > 0 && i < texts.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    return embeddings;
  }

  async embedText(text: string): Promise<number[]> {
    return this.embedTextForQuery(text);
  }
}
