interface ConnectRepoModalProps {
  open: boolean;
  owner: string;
  name: string;
  error: string | null;
  loading: boolean;
  onOwnerChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ConnectRepoModal({
  open,
  owner,
  name,
  error,
  loading,
  onOwnerChange,
  onNameChange,
  onSubmit,
  onClose,
}: ConnectRepoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">Connect GitHub Repository</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Uses your GitHub PAT to fetch repository metadata and pull requests.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">Owner</span>
            <input
              value={owner}
              onChange={(e) => onOwnerChange(e.target.value)}
              placeholder="acme"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-dim)]"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--color-muted)]">Repository</span>
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="demo-app"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent-dim)]"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || !owner || !name}
            className="rounded-lg bg-[var(--color-accent-dim)] px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
