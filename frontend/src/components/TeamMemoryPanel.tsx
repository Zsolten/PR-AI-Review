import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { TeamRule } from "../types";

interface TeamMemoryPanelProps {
  repositoryId: string | null;
}

export function TeamMemoryPanel({ repositoryId }: TeamMemoryPanelProps) {
  const [rules, setRules] = useState<TeamRule[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
          Team Rules
        </span>
        <span className="text-[10px] text-zinc-500">{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div className="space-y-3 px-3 pb-3">
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
