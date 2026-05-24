import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  GITHUB_PAT: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
  /** Gemini API embedding model (text-embedding-004 is not available on embedContent). */
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-001"),
  /** Output size; must match pgvector column vector(N) and outputDimensionality. */
  RAG_EMBEDDING_DIMENSION: z.coerce.number().default(768),
  /** Free-tier friendly default; raise via env for paid keys / full repos. */
  RAG_MAX_INDEX_FILES: z.coerce.number().default(20),
  RAG_MAX_CHUNKS_PER_FILE: z.coerce.number().default(2),
  /** Hard cap on embed API calls per index run (free tier ~100–1500 RPM depending on model). */
  RAG_MAX_TOTAL_CHUNKS: z.coerce.number().default(35),
  RAG_CHUNK_SIZE: z.coerce.number().default(2400),
  RAG_CHUNK_OVERLAP: z.coerce.number().default(200),
  RAG_EMBED_DELAY_MS: z.coerce.number().default(1200),
  RAG_EMBED_MAX_RETRIES: z.coerce.number().default(5),
  /** Top similar chunks/files injected into Story Mode (deduped by path). */
  RAG_TOP_K: z.coerce.number().default(3),
  AI_TOOLS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v !== "false" && v !== "0"),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}
