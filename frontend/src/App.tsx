import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import { Sidebar } from "./components/Sidebar";
import { ConnectRepoModal } from "./components/ConnectRepoModal";
import { AIReviewPanel } from "./components/AIReviewPanel";
import { ChangedFilesPanel } from "./components/ChangedFilesPanel";
import { ChatPanel } from "./components/ChatPanel";
import { TeamMemoryPanel } from "./components/TeamMemoryPanel";
import { usePolling } from "./hooks/usePolling";
import type { ChatMessage, PullRequestDetail, PullRequestListItem, Repository } from "./types";

export default function App() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequestListItem[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string | null>(null);
  const [prDetail, setPrDetail] = useState<PullRequestDetail | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [owner, setOwner] = useState("acme");
  const [name, setName] = useState("demo-app");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  const [prFilter, setPrFilter] = useState<"open" | "closed" | "all">("all");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [refreshingPr, setRefreshingPr] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<"review" | "files">("review");

  const loadRepositories = useCallback(async () => {
    const repos = await api.listRepositories();
    setRepositories(repos);
    if (!selectedRepoId && repos.length > 0) {
      setSelectedRepoId(repos[0].id);
    }
  }, [selectedRepoId]);

  useEffect(() => {
    void loadRepositories().catch(console.error);
  }, [loadRepositories]);

  useEffect(() => {
    if (!selectedRepoId) {
      setPullRequests([]);
      return;
    }
    void api
      .listPullRequests(selectedRepoId, prFilter)
      .then((prs) => {
        setPullRequests(prs);
        setSelectedPrId((current) => current ?? prs[0]?.id ?? null);
      })
      .catch(console.error);
  }, [selectedRepoId, prFilter]);

  useEffect(() => {
    if (!selectedPrId) {
      setPrDetail(null);
      return;
    }
    setChatError(null);
    setOptimisticMessages([]);
    void api
      .getPullRequest(selectedPrId)
      .then(async (detail) => {
        setPrDetail(detail);
        const needsFiles =
          detail.files.length === 0 &&
          detail.additions === 0 &&
          detail.deletions === 0;
        if (needsFiles) {
          setRefreshingPr(true);
          try {
            const refreshed = await api.refreshPullRequest(selectedPrId);
            setPrDetail(refreshed);
            const prs = await api.listPullRequests(selectedRepoId!, prFilter);
            setPullRequests(prs);
          } catch (e) {
            console.error(e);
          } finally {
            setRefreshingPr(false);
          }
        }
      })
      .catch(console.error);
  }, [selectedPrId, selectedRepoId, prFilter]);

  const handleRefreshPr = async () => {
    if (!selectedPrId) return;
    setRefreshingPr(true);
    try {
      const refreshed = await api.refreshPullRequest(selectedPrId);
      setPrDetail(refreshed);
      if (selectedRepoId) {
        const prs = await api.listPullRequests(selectedRepoId, prFilter);
        setPullRequests(prs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshingPr(false);
    }
  };

  const refreshPr = useCallback(async () => {
    if (!selectedPrId) return;
    const detail = await api.getPullRequest(selectedPrId);
    setPrDetail(detail);
  }, [selectedPrId]);

  const reviewInProgress = generating || !!activeReviewId;

  usePolling(async () => {
    if (!activeReviewId) return;
    const review = await api.getReview(activeReviewId);
    if (review.status === "COMPLETED" || review.status === "FAILED") {
      setActiveReviewId(null);
      setGenerating(false);
      await refreshPr();
    }
  }, 2000, reviewInProgress);

  const handleConnect = async () => {
    setConnectError(null);
    setLoading(true);
    try {
      const repo = await api.registerRepository(owner, name);
      const { pullRequests: prs, synced } = await api.syncPullRequests(repo.id, "all");
      await loadRepositories();
      setSelectedRepoId(repo.id);
      setPullRequests(prs);
      setLastSynced(synced);
      setSyncError(null);
      setModalOpen(false);
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedRepoId) return;
    setLoading(true);
    setSyncError(null);
    try {
      const { pullRequests: prs, synced } = await api.syncPullRequests(
        selectedRepoId,
        prFilter
      );
      setPullRequests(prs);
      setLastSynced(synced);
      if (synced === 0) {
        setSyncError(
          `No ${prFilter === "all" ? "" : prFilter + " "}PRs found on GitHub for this filter.`
        );
      }
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReview = async () => {
    if (!selectedPrId) return;
    setGenerating(true);
    try {
      const { reviewId } = await api.generateReview(selectedPrId);
      setActiveReviewId(reviewId);
      await refreshPr();
    } catch (e) {
      console.error(e);
      setGenerating(false);
    }
  };

  const handleChat = async (message: string) => {
    if (!selectedPrId) return;
    setChatError(null);
    setChatSending(true);
    setOptimisticMessages([
      {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      await api.chat(selectedPrId, message);
      setOptimisticMessages([]);
      await refreshPr();
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Chat request failed";
      setChatError(errMsg);
      setOptimisticMessages([]);
      try {
        await refreshPr();
      } catch {
        /* keep optimistic message if refresh fails */
      }
    } finally {
      setChatSending(false);
    }
  };

  const chatMessages = [
    ...(prDetail?.chatMessages ?? []),
    ...optimisticMessages.filter(
      (o) => !prDetail?.chatMessages.some((m) => m.content === o.content && m.role === o.role)
    ),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex h-full w-72 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <Sidebar
          repositories={repositories}
          selectedRepoId={selectedRepoId}
          pullRequests={pullRequests}
          selectedPrId={selectedPrId}
          prFilter={prFilter}
          onPrFilterChange={setPrFilter}
          onSelectRepo={setSelectedRepoId}
          onSelectPr={setSelectedPrId}
          onSync={handleSync}
          loading={loading}
          syncError={syncError}
          lastSynced={lastSynced}
          embedded
        />
        <TeamMemoryPanel
          repositoryId={selectedRepoId}
          repository={repositories.find((r) => r.id === selectedRepoId) ?? null}
          onRepositoryIndexed={() => void loadRepositories()}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[var(--color-border)] pl-4 pr-6">
          <div>
            {prDetail ? (
              <>
                <h2 className="text-lg font-semibold leading-tight">{prDetail.title}</h2>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  #{prDetail.number} · {prDetail.author} · {prDetail.headBranch} →{" "}
                  {prDetail.baseBranch} · +{prDetail.additions} -{prDetail.deletions} ·{" "}
                  {prDetail.changedFiles} files
                </p>
              </>
            ) : (
              <h2 className="text-lg font-semibold text-zinc-400">Select a pull request</h2>
            )}
          </div>
          <div className="flex gap-2">
            {prDetail && (
              <button
                type="button"
                onClick={handleRefreshPr}
                disabled={refreshingPr}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
              >
                {refreshingPr ? "Loading diffs…" : "Refresh diffs"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-zinc-800"
            >
              Connect repo
            </button>
            {prDetail?.htmlUrl && (
              <a
                href={prDetail.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-zinc-800"
              >
                View on GitHub
              </a>
            )}
          </div>
        </header>

        {!prDetail ? (
          <div className="flex flex-1 items-center justify-center p-8 text-[var(--color-muted)]">
            <div className="max-w-md text-center">
              <p className="text-sm">
                Connect a repository or use seeded demo data, then pick a pull request from the
                sidebar.
              </p>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 rounded-lg bg-[var(--color-accent-dim)] px-4 py-2 text-sm font-medium text-zinc-900"
              >
                Connect GitHub repository
              </button>
            </div>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden py-3 pl-4 pr-6 lg:grid-cols-5">
            <div className="flex flex-col gap-4 overflow-hidden lg:col-span-3">
              {prDetail.body && (
                <section className="shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                    Description
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{prDetail.body}</p>
                </section>
              )}

              {activePanelTab === "review" ? (
                <AIReviewPanel
                  reviews={prDetail.reviews}
                  generating={generating || reviewInProgress}
                  onGenerate={handleGenerateReview}
                  activePanelTab={activePanelTab}
                  onTabChange={setActivePanelTab}
                  filesCount={prDetail.files.length}
                />
              ) : (
                <ChangedFilesPanel 
                  files={prDetail.files} 
                  activePanelTab={activePanelTab}
                  onTabChange={setActivePanelTab}
                  filesCount={prDetail.files.length}
                />
              )}
            </div>
            <div className="lg:col-span-2 flex flex-col min-h-0">
              <ChatPanel
                messages={chatMessages}
                onSend={handleChat}
                sending={chatSending}
                error={chatError}
              />
            </div>
          </div>
        )}
      </main>

      <ConnectRepoModal
        open={modalOpen}
        owner={owner}
        name={name}
        error={connectError}
        loading={loading}
        onOwnerChange={setOwner}
        onNameChange={setName}
        onSubmit={handleConnect}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
