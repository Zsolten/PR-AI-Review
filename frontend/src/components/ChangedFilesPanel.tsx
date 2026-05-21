import { useState } from "react";
import type { PullRequestFile } from "../types";

interface ChangedFilesPanelProps {
  files: PullRequestFile[];
  activePanelTab: "review" | "files";
  onTabChange: (tab: "review" | "files") => void;
  filesCount: number;
}

export function ChangedFilesPanel({ files, activePanelTab, onTabChange, filesCount }: ChangedFilesPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(files[0]?.id ?? null);

  return (
    <section className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="shrink-0 flex h-[60px] items-center gap-3 border-b border-[var(--color-border)] px-4 bg-[var(--color-surface-elevated)]">
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
      </div>
      <ul className="flex-1 overflow-y-auto divide-y divide-[var(--color-border)]">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === file.id ? null : file.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40"
            >
              <span 
                className="block truncate pr-4 text-left font-mono text-sm"
                title={file.filename}
              >
                {file.filename}
              </span>
              <span className="shrink-0 text-xs text-[var(--color-muted)]">
                {file.status} · +{file.additions} -{file.deletions}
              </span>
            </button>
            {expanded === file.id && file.patch && (
              <pre className="max-h-64 overflow-auto border-t border-[var(--color-border)] bg-zinc-950/80 px-4 py-3 font-mono text-xs leading-relaxed text-zinc-300">
                {file.patch}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
