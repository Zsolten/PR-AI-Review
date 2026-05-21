import type { PullRequestListItem, Repository } from "../types";

interface SidebarProps {
  repositories: Repository[];
  selectedRepoId: string | null;
  pullRequests: PullRequestListItem[];
  selectedPrId: string | null;
  prFilter: "open" | "closed" | "all";
  onPrFilterChange: (filter: "open" | "closed" | "all") => void;
  onSelectRepo: (id: string) => void;
  onSelectPr: (id: string) => void;
  onSync: () => void;
  loading?: boolean;
  syncError?: string | null;
  lastSynced?: number | null;
}

export function Sidebar({
  repositories,
  selectedRepoId,
  pullRequests,
  selectedPrId,
  prFilter,
  onPrFilterChange,
  onSelectRepo,
  onSelectPr,
  onSync,
  loading,
  syncError,
  lastSynced,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          <h1 className="text-sm font-semibold tracking-tight">PR Review AI</h1>
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted)]">Repository-aware code review</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
            Repositories
          </span>
          {selectedRepoId && (
            <button
              type="button"
              onClick={onSync}
              disabled={loading}
              className="text-[10px] text-[var(--color-accent)] hover:underline disabled:opacity-50"
            >
              {loading ? "Syncing…" : "Sync PRs"}
            </button>
          )}
        </div>

        {repositories.length === 0 ? (
          <p className="px-2 text-xs text-[var(--color-muted)]">No repositories connected yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {repositories.map((repo) => (
              <li key={repo.id}>
                <button
                  type="button"
                  onClick={() => onSelectRepo(repo.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm transition ${
                    selectedRepoId === repo.id
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-300 hover:bg-zinc-800/60"
                  }`}
                >
                  <span className="font-medium">{repo.fullName}</span>
                  <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                    {repo._count?.pullRequests ?? 0} pull requests
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedRepoId && (
          <>
            <div className="mb-2 mt-6 flex items-center justify-between gap-2 px-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Pull Requests
              </span>
              <select
                value={prFilter}
                onChange={(e) =>
                  onPrFilterChange(e.target.value as "open" | "closed" | "all")
                }
                className="rounded border border-[var(--color-border)] bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-300"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {syncError && (
              <p className="mb-2 px-2 text-xs text-red-400">{syncError}</p>
            )}
            {lastSynced != null && lastSynced > 0 && !syncError && (
              <p className="mb-2 px-2 text-[10px] text-[var(--color-muted)]">
                Synced {lastSynced} from GitHub
              </p>
            )}

            {pullRequests.length === 0 ? (
              <p className="px-2 text-xs text-[var(--color-muted)]">
                No PRs for this filter. Click <strong>Sync PRs</strong> (uses filter:{" "}
                {prFilter}).
              </p>
            ) : (
              <ul className="space-y-0.5">
                {pullRequests.map((pr) => (
                  <li key={pr.id}>
                    <button
                      type="button"
                      onClick={() => onSelectPr(pr.id)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm transition ${
                        selectedPrId === pr.id
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-300 hover:bg-zinc-800/60"
                      }`}
                    >
                      <span className="text-[var(--color-muted)]">#{pr.number}</span>{" "}
                      {pr.state === "closed" && (
                        <span className="text-[10px] text-zinc-500">[closed] </span>
                      )}
                      <span className="line-clamp-2">{pr.title}</span>
                      <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">
                        {pr.author} · +{pr.additions} -{pr.deletions}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
