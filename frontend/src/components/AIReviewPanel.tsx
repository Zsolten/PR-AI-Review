import { useState } from "react";
import type { AIComment, AIReview } from "../types";
import { PRStoryTimeline } from "./PRStoryTimeline";

const CATEGORY_LABELS: Record<string, string> = {
  ERROR_HANDLING: "Error handling",
  BUG_RISK: "Bug risk",
  READABILITY: "Readability",
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  GENERAL: "General",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  info: "border-zinc-600 bg-zinc-800/50 text-zinc-300",
};

type ReviewViewMode = "review" | "story";

interface AIReviewPanelProps {
  reviews: AIReview[];
  generating: boolean;
  onGenerate: () => void;
}

export function AIReviewPanel({ reviews, generating, onGenerate }: AIReviewPanelProps) {
  const [viewMode, setViewMode] = useState<ReviewViewMode>("review");
  const latest = reviews[0];
  const inProgress =
    latest?.status === "PENDING" || latest?.status === "PROCESSING" || generating;

  return (
    <section className="flex-1 min-h-0 overflow-hidden flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-elevated)]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">AI Review</h3>
          <div className="flex rounded-lg border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("review")}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
                viewMode === "review"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => setViewMode("story")}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition ${
                viewMode === "story"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Story Mode
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="rounded-lg bg-[var(--color-accent-dim)] px-3 py-1.5 text-xs font-medium text-zinc-900 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate AI Review"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {!latest ? (
          <p className="text-sm text-[var(--color-muted)]">
            No AI review yet. Generate one to get a summary, risk analysis, and a guided story
            walkthrough of the changed files.
          </p>
        ) : latest.status === "FAILED" ? (
          <p className="text-sm text-[var(--color-danger)]">{latest.errorMessage ?? "Review failed"}</p>
        ) : inProgress ? (
          <p className="text-sm text-[var(--color-muted)] animate-pulse">
            AI review in progress… building review insights and story walkthrough.
          </p>
        ) : viewMode === "story" ? (
          <>
            <p className="text-xs text-[var(--color-muted)]">
              Files ordered for understanding — not alphabetically. Switch to Review for risks and
              comments.
            </p>
            {latest.storyWalkthrough ? (
              <PRStoryTimeline storySteps={latest.storyWalkthrough} />
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Story walkthrough is not available for this review. Generate a new review to build
                one.
              </p>
            )}
          </>
        ) : (
          <>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Summary
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-zinc-200">{latest.summary}</p>
            </div>
            {latest.riskAnalysis && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Risk analysis
                </h4>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
                  {latest.riskAnalysis}
                </pre>
              </div>
            )}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Comments ({latest.comments.length})
              </h4>
              <ul className="space-y-2">
                {latest.comments.map((c: AIComment) => (
                  <li
                    key={c.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[c.severity] ?? SEVERITY_STYLES.info}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      {c.file && <span className="font-mono text-[var(--color-muted)]">{c.file}</span>}
                    </div>
                    <p className="mt-1">{c.message}</p>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
