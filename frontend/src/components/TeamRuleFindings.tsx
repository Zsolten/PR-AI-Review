import type { TeamRuleFinding } from "../types";

const STATUS_STYLES: Record<string, string> = {
  pass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  violation: "border-red-500/40 bg-red-500/10 text-red-300",
  needs_review: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

const STATUS_LABELS: Record<string, string> = {
  pass: "Pass",
  violation: "Violation",
  needs_review: "Needs review",
};

interface TeamRuleFindingsProps {
  findings: TeamRuleFinding[];
}

export function TeamRuleFindings({ findings }: TeamRuleFindingsProps) {
  if (findings.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-zinc-950/50 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        Team rule evaluation
      </h4>
      <ul className="mt-3 space-y-2">
        {findings.map((finding, index) => (
          <li
            key={`${finding.rule}-${index}`}
            className={`rounded-lg border px-3 py-2 text-sm ${
              STATUS_STYLES[finding.status] ?? STATUS_STYLES.needs_review
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase">
                {STATUS_LABELS[finding.status] ?? finding.status}
              </span>
              {finding.relatedFiles.length > 0 && (
                <span className="font-mono text-[10px] text-[var(--color-muted)]">
                  {finding.relatedFiles.join(", ")}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs font-medium text-zinc-200">{finding.rule}</p>
            <p className="mt-1 text-xs leading-relaxed opacity-90">{finding.evidence}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
