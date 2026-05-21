import type { AIComment, AIReview } from "../types";

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

interface AIReviewPanelProps {
  reviews: AIReview[];
  generating: boolean;
  onGenerate: () => void;
}

export function AIReviewPanel({ reviews, generating, onGenerate }: AIReviewPanelProps) {
  const latest = reviews[0];

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">AI Review</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="rounded-lg bg-[var(--color-accent-dim)] px-3 py-1.5 text-xs font-medium text-zinc-900 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate AI Review"}
        </button>
      </div>

      <div className="space-y-4 p-4">
        {!latest ? (
          <p className="text-sm text-[var(--color-muted)]">
            No AI review yet. Generate one to get a summary and actionable comments.
          </p>
        ) : latest.status === "PENDING" || latest.status === "PROCESSING" ? (
          <p className="text-sm text-[var(--color-muted)] animate-pulse">
            AI review in progress…
          </p>
        ) : latest.status === "FAILED" ? (
          <p className="text-sm text-[var(--color-danger)]">{latest.errorMessage ?? "Review failed"}</p>
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
