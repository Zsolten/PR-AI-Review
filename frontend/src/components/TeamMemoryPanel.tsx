import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { Repository, TeamRule } from "../types";

interface TeamMemoryPanelProps {
  repositoryId: string | null;
  repository: Repository | null;
  onRepositoryIndexed?: () => void;
}

export function TeamMemoryPanel({
  repositoryId,
  repository,
  onRepositoryIndexed,
}: TeamMemoryPanelProps) {
  const [rules, setRules] = useState<TeamRule[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadRules = useCallback(async () => {
    if (!repositoryId) {
      setRules([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTeamRules(repositoryId);
      setRules(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team rules");
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const handleAdd = async () => {
    if (!repositoryId || !draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const rule = await api.createTeamRule(repositoryId, draft.trim());
      setRules((prev) => [...prev, rule]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add rule");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: TeamRule) => {
    if (!repositoryId) return;
    try {
      const updated = await api.updateTeamRule(repositoryId, rule.id, {
        enabled: !rule.enabled,
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update rule");
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!repositoryId) return;
    try {
      await api.deleteTeamRule(repositoryId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    }
  };

  const handleIndex = async () => {
    if (!repositoryId) return;
    setIndexing(true);
    setError(null);
    setIndexMessage(null);
    try {
      const result = await api.indexRepository(repositoryId);
      const summary = `Indexed ${result.filesProcessed} files (${result.chunksStored} chunks) on ${result.branch}.`;
      setIndexMessage(result.message ? `${summary} ${result.message}` : summary);
      if (result.quotaLimited) {
        setError(
          "Partial index: Gemini free-tier quota reached. RAG still works with indexed files; retry later or lower scope in .env."
        );
      }
      onRepositoryIndexed?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to index repository");
    } finally {
      setIndexing(false);
    }
  };

  if (!repositoryId) {
    return (
      <section className="shrink-0 border-t border-[var(--color-border)] px-3 py-3">
        <p className="text-[10px] text-[var(--color-muted)]">
          Select a repository to manage team rules.
        </p>
      </section>
    );
  }

  return (
    <section className="shrink-0 border-t border-[var(--color-border)] bg-zinc-950/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-zinc-800/40"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Team Memory
        </span>
        <span className="text-[10px] text-zinc-500">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 px-3 pb-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-zinc-900/50 px-2 py-2">
            <p className="text-[10px] font-medium text-zinc-300">Repository memory (RAG)</p>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--color-muted)]">
              Index the default branch into pgvector so reviews, Story Mode, and chat can reference
              related files outside the PR diff.
            </p>
            {repository?.indexedAt ? (
              <p className="mt-1.5 text-[10px] text-emerald-400/90">
                Last indexed: {new Date(repository.indexedAt).toLocaleString()}
                {repository.indexBranch ? ` (${repository.indexBranch})` : ""}
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-amber-300/90">Not indexed yet.</p>
            )}
            {indexMessage && (
              <p className="mt-1.5 text-[10px] text-emerald-400/90">{indexMessage}</p>
            )}
            <button
              type="button"
              onClick={() => void handleIndex()}
              disabled={indexing}
              className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-zinc-800 px-2 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              {indexing ? "Indexing…" : "Index repository"}
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
            Plain-English rules applied strictly during Story Mode generation for this repository.
          </p>

          {error && <p className="text-[10px] text-red-400">{error}</p>}

          {loading ? (
            <p className="text-[10px] text-[var(--color-muted)] animate-pulse">Loading rules…</p>
          ) : rules.length === 0 ? (
            <p className="text-[10px] text-[var(--color-muted)]">No team rules yet.</p>
          ) : (
            <ul className="max-h-36 space-y-1.5 overflow-y-auto">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className={`rounded-lg border px-2 py-1.5 ${
                    rule.enabled
                      ? "border-[var(--color-border)] bg-zinc-900/60"
                      : "border-zinc-800 bg-zinc-950/60 opacity-60"
                  }`}
                >
                  <p className="text-[11px] leading-relaxed text-zinc-300">{rule.content}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggle(rule)}
                      className="text-[10px] text-[var(--color-accent)] hover:underline"
                    >
                      {rule.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(rule.id)}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder='e.g. "No new dependencies in billing service without security approval"'
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-200 outline-none focus:border-[var(--color-accent-dim)]"
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving || !draft.trim()}
            className="w-full rounded-lg bg-[var(--color-accent-dim)] px-2 py-1.5 text-[10px] font-medium text-zinc-900 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add rule"}
          </button>
        </div>
      )}
    </section>
  );
}
