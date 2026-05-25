# PR Review AI

AI-powered pull request review application focused on developer workflow and repository-aware code understanding. Not a GitHub clone — a focused tool for AI-assisted PR review, risk analysis, and conversational Q&A.

## Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (pgvector image for future embeddings)
- **ORM:** Prisma
- **AI:** Google Gemini API (free tier supported)
- **Dev:** Docker Compose

## Features (MVP)

- Connect GitHub repositories (PAT)
- Receive GitHub webhook events (`pull_request` opened/synchronize)
- Codebase Indexing & Embeddings utilizing `pgvector`
- Story Mode Review generation determining logical chronological reading order for developers
- Custom automated Team Rules evaluation directly against code diff patterns
- Repository-aware Contextual RAG ensuring PR evaluation considers coupled files across the un-modified codebase
- View PRs in a dashboard sidebar
- Async AI review generation (summary, risks, categorized comments, team rules, and story timeline)
- Conversational chat about the PR

## Quick start

### Prerequisites

- Node.js 20+
- Docker Desktop (or Docker Engine)
- GitHub Personal Access Token (`repo` scope)
- [Gemini API key](https://aistudio.google.com/apikey) (free tier)

### 1. Clone and install

```bash
cd pr-review-ai
cp .env.example .env
# Edit .env with your GITHUB_PAT, GEMINI_API_KEY, GITHUB_WEBHOOK_SECRET
npm run setup
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

The app uses **host port 5433** (not 5432) so it does not conflict with a local PostgreSQL install on Windows. Your `DATABASE_URL` must use port `5433`.

### 3. Database setup

```bash
cd backend
cp ../.env .env
npm run db:push
npm run db:generate
npm run db:seed
```

### 4. Run the app

From the project root:

```bash
npm run dev
```

- API: http://localhost:4000
- UI: http://localhost:5173

The frontend proxies `/api` to the backend in development.

### Demo without GitHub

Run the seed script — it creates `acme/demo-app` with PR #42 and a sample AI review. Open the UI and select the repository and PR from the sidebar.

## GitHub webhook setup

1. Expose your API (e.g. [ngrok](https://ngrok.com)): `ngrok http 4000`
2. In GitHub → Repository → Settings → Webhooks → Add webhook:
   - **Payload URL:** `https://<your-host>/api/webhooks/github`
   - **Content type:** `application/json`
   - **Secret:** same as `GITHUB_WEBHOOK_SECRET` in `.env`
   - **Events:** Pull requests
3. On `opened` / `synchronize`, the app upserts the PR and syncs file diffs.

## Connect a real repository

1. Set `GITHUB_PAT` in `.env`
2. In the UI, click **Connect repo** and enter `owner` / `name`
3. Click **Sync PRs** to fetch pull requests and file diffs from GitHub (filter: **All**, **Open**, or **Closed** in the sidebar). Sync may take longer per repo because it loads each PR’s changed files.
4. Open a PR and use **Refresh diffs** if changed files look empty


## Environment variables

See `.env.example` for all options.

### Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Add it to **`backend/.env`** (required — the server reads this file):
   ```
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.0-flash
   ```
3. Free-tier alternatives if you hit limits: `gemini-2.0-flash-lite`, `gemini-1.5-flash`, or `gemini-1.5-flash-8b`.

After changing keys, restart the backend (`npm run dev`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend + frontend |
| `npm run db:up` | Start Postgres |
| `npm run db:migrate` | Prisma migrate (interactive) |
| `npm run db:seed` | Demo data |

## Architecture notes

- **Modular backend:** domain modules + thin routes + service container
- **Async AI:** reviews return `202` with `reviewId`; processing runs in background
- **Extensible AI layer:** prompts in `modules/ai/prompts.ts`, orchestration isolated for future RAG/agents
- **No auth in MVP:** single-tenant local/demo use

## Next steps (suggested)

See the architecture improvements section in the assistant response or extend with:

- **RAG:** embed `PullRequestFile.patch` + repo docs; retrieval before `generateReview` (Gemini embeddings API)
- **pgvector:** `Embedding` model + `vector` column; similarity search per repository
- **Repository memory:** persist summaries and conventions per `Repository`
- **Async pipelines:** BullMQ / Redis queue instead of `setImmediate`
- **Agent reviews:** multi-step tools (lint, test impact, security scanners) orchestrated by an agent loop
