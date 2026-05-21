import { useState } from "react";
import type { PullRequestFile } from "../types";

interface ChangedFilesPanelProps {
  files: PullRequestFile[];
}

export function ChangedFilesPanel({ files }: ChangedFilesPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(files[0]?.id ?? null);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold">Changed files ({files.length})</h3>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === file.id ? null : file.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/40"
            >
              <span className="font-mono text-sm">{file.filename}</span>
              <span className="text-xs text-[var(--color-muted)]">
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
