import { useState } from "react";
import type { AIComment, AIReview } from "../types";
import { PRStoryTimeline } from "./PRStoryTimeline";
import { TeamRuleFindings } from "./TeamRuleFindings";

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
  activePanelTab: "review" | "files";
  onTabChange: (tab: "review" | "files") => void;
  filesCount: number;
}

export function AIReviewPanel({ reviews, generating, onGenerate, activePanelTab, onTabChange, filesCount }: AIReviewPanelProps) {
  const [viewMode, setViewMode] = useState<ReviewViewMode>("review");
  const latest = reviews[0];
  const inProgress =
    latest?.status === "PENDING" || latest?.status === "PROCESSING" || generating;

  return (
    <section className="flex-1 min-h-0 overflow-hidden flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="shrink-0 flex h-[60px] items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 bg-[var(--color-surface-elevated)]">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[var(--color-border)] p-0.5 bg-zinc-950/40">
            <button
              onClick={() => onTabChange("review")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activePanelTab === "review"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              AI Review
            </button>
            <button
              onClick={() => onTabChange("files")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activePanelTab === "files"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Changed Files
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950/80 text-[9px]">
                {filesCount}
              </span>
            </button>
          </div>
          <div className="h-5 w-px bg-[var(--color-border)] mx-1"></div>
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
            {latest.storyWalkthrough ? (
              <>
                {latest.storyWalkthrough.relatedContext &&
                  latest.storyWalkthrough.relatedContext.length > 0 && (
                    <div className="rounded-xl border border-[var(--color-border)] bg-zinc-950/50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        Related codebase context (RAG)
                      </h4>
                      <ul className="mt-2 space-y-1">
                        {latest.storyWalkthrough.relatedContext.map((r) => (
                          <li
                            key={r.path}
                            className="font-mono text-[11px] text-zinc-300"
                          >
                            {r.path}
                            <span className="ml-2 text-[var(--color-muted)]">
                              {(r.similarity * 100).toFixed(0)}% match
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {latest.storyWalkthrough.teamRuleFindings.length > 0 && (
                  <TeamRuleFindings findings={latest.storyWalkthrough.teamRuleFindings} />
                )}
                <PRStoryTimeline storySteps={latest.storyWalkthrough.storySteps} />
              </>
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
            {latest.storyWalkthrough && latest.storyWalkthrough.teamRuleFindings?.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Team Rules
                </h4>
                <ul className="space-y-2">
                  {latest.storyWalkthrough.teamRuleFindings.map((finding, idx) => {
                    const isPass = finding.status === "pass";
                    const isViol = finding.status === "violation";
                    const statusClass = isPass
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : isViol
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-200";

                    return (
                      <li
                        key={idx}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${statusClass}`}
                      >
                        <span className="truncate pr-4 font-medium opacity-90" title={finding.rule}>
                          {finding.rule}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider opacity-80">
                          {finding.status.replace("_", " ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {latest.riskAnalysis && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Risk analysis
                </h4>
                <div className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES["warning"]}`}>
                   <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* <span className="font-medium">Risk Analysis</span> */}
                   </div>
                   <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                     {latest.riskAnalysis}
                   </pre>
                </div>
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
