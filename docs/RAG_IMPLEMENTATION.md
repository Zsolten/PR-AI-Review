# Repository Memory (pgvector RAG) — Implementation Guide

Architecture-aware Story Mode uses **Retrieval-Augmented Generation**: the PR diff is embedded and matched against indexed chunks from the repository default branch.

## Prerequisites

- Docker Postgres image: `pgvector/pgvector:pg16` (already in `docker-compose.yml`)
- `GEMINI_API_KEY` for chat + **text embeddings**
- `GITHUB_PAT` with `repo` scope to read file trees

## Step 1 — Enable pgvector & schema

### 1.1 Run migration

```bash
cd backend
npx prisma migrate deploy
# or dev: npx prisma migrate dev
npx prisma generate
```

Migration `20250521120000_pgvector_rag`:

- `CREATE EXTENSION vector`
- `RepositoryFile` table with `embedding vector(768)` and HNSW index
- `Repository.indexedAt` / `indexBranch`

### 1.2 Prisma model

`RepositoryFile` stores **chunks** (not whole files):

| Field | Purpose |
|-------|---------|
| `path` | File path on default branch |
| `chunkIndex` | Chunk offset within file |
| `content` | Chunk text |
| `embedding` | `vector(768)` via raw SQL (Prisma `Unsupported`) |

## Step 2 — Ingestion pipeline

**Module:** `backend/src/modules/rag/ingestion.service.ts`

Flow:

1. Load repository metadata from DB
2. `GitHubService.listRepositoryFilePaths` (recursive tree, capped)
3. Filter indexable extensions (`.ts`, `.py`, …) — skip `node_modules`, etc.
4. Fetch file content per path
5. `chunkText()` — ~1800 chars with 200 overlap
6. `EmbeddingService.embedTexts()` — Gemini `gemini-embedding-001` (768-dim)
7. `VectorStore.upsertChunk()` — pgvector insert
8. Update `Repository.indexedAt`

**Trigger indexing:**

```http
POST /api/repositories/:id/index
```

UI: **Team Memory** panel → **Index repository**

Env tuning:

| Variable | Default | Meaning |
|----------|---------|---------|
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Embedding model (`text-embedding-004` is not on Gemini API) |
| `RAG_EMBEDDING_DIMENSION` | `768` | Must match pgvector column + `outputDimensionality` |
| `RAG_MAX_INDEX_FILES` | `20` | Max source files per index run (free tier) |
| `RAG_MAX_CHUNKS_PER_FILE` | `2` | Chunks per file |
| `RAG_MAX_TOTAL_CHUNKS` | `35` | Max embed API calls per index run |
| `RAG_EMBED_DELAY_MS` | `1200` | Pause between embed requests |
| `RAG_CHUNK_SIZE` | `2400` | Characters per chunk |
| `RAG_TOP_K` | `3` | Related files injected into Story Mode |

### Free tier vs full repo

Gemini free keys have **daily and per-minute** embedding limits. Indexing 200 files × multiple chunks = hundreds of `embedContent` calls, which often hits **429** on one click.

Defaults above index ~20 important paths (`src/`, `backend/`, etc.) with at most **35** embed calls — enough for a **demo** and Story Mode RAG. For a full repo, use a paid key or raise limits gradually:

```env
RAG_MAX_INDEX_FILES=50
RAG_MAX_TOTAL_CHUNKS=100
RAG_EMBED_DELAY_MS=2000
```

## Step 3 — Retrieval (RAG)

**Module:** `backend/src/modules/rag/retrieval.service.ts`

On each AI review:

1. Build query text from PR title, body, and changed-file diffs
2. Embed query with Gemini
3. Cosine similarity search: `ORDER BY embedding <=> query`
4. Exclude paths already in the PR diff
5. Deduplicate by path (best chunk per file)
6. Return top `RAG_TOP_K` results

**Module:** `backend/src/modules/rag/vector.store.ts` — raw SQL for pgvector ops

## Step 4 — AI orchestration

**`ReviewOrchestratorService`:**

```text
processReview: PR detail → RAG retrieve → parallel(generateReview, generatePRStory + context)
chat:        PR detail + user message → RAG retrieve (query includes question) → chat + context
```

**`GeminiService.generatePRStory`** receives `relatedContext[]` and injects:

```text
RELATED CODEBASE CONTEXT (existing repository files NOT in this PR diff…)
```

**Prompt rules** (`prompts.ts`):

- Reference related files explicitly
- Do not claim files are “missing” if they appear in context
- Do not invent files outside PR + context

Stored on review:

```json
{
  "storySteps": [...],
  "teamRuleFindings": [...],
  "relatedContext": [{ "path": "src/services/user.ts", "similarity": 0.82 }]
}
```

## Module map

```text
modules/embeddings/embedding.service.ts   → Gemini embeddings
modules/rag/chunking.ts                   → Text chunking
modules/rag/constants.ts                  → Path filters
modules/rag/vector.store.ts               → pgvector CRUD/search
modules/rag/ingestion.service.ts          → Index repository
modules/rag/retrieval.service.ts          → PR-time retrieval
modules/ai/prompts.ts                     → Story prompt + context block
modules/reviews/reviewOrchestrator.service.ts → Wiring
```

## Operational checklist

1. `docker compose up -d postgres`
2. `cd backend && npx prisma migrate deploy && npx prisma generate`
3. Set `GEMINI_API_KEY`, `GITHUB_PAT`, `DATABASE_URL` (port **5433**)
4. Connect repo in UI
5. **Index repository** in the sidebar (once per repo / after large changes)
6. Generate AI review → open **Story Mode** or chat

Without indexing, Story Mode still works but shows no related context block.

## Limitations (MVP)

- Indexes **default branch** only (not PR head)
- File cap (`RAG_MAX_INDEX_FILES`) and 100KB per-file GitHub limit
- Synchronous indexing HTTP call (large repos may take minutes)
- Embeddings are per-chunk sequential (rate-limit friendly, not batched API)
