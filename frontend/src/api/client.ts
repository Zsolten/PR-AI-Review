import type {
  AIReview,
  PullRequestDetail,
  PullRequestListItem,
  Repository,
  StoryStep,
} from "../types";

const API_BASE =
  import.meta.env.VITE_API_URL === "http://localhost:4000"
    ? ""
    : (import.meta.env.VITE_API_URL ?? "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }

  return res.json() as Promise<T>;
}

function parseStoryWalkthrough(data: unknown): StoryStep[] | null {
  if (!Array.isArray(data)) return null;
  const steps = data.filter((step): step is StoryStep => {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    return (
      typeof s.filename === "string" &&
      typeof s.orderIndex === "number" &&
      typeof s.logicalLayer === "string" &&
      typeof s.narrative === "string"
    );
  });
  return steps.length > 0 ? steps.sort((a, b) => a.orderIndex - b.orderIndex) : null;
}

function normalizeReview(review: AIReview & { storyWalkthrough?: unknown }): AIReview {
  return {
    ...review,
    storyWalkthrough: parseStoryWalkthrough(review.storyWalkthrough),
  };
}

function normalizePullRequestDetail(detail: PullRequestDetail): PullRequestDetail {
  return {
    ...detail,
    reviews: detail.reviews.map((review) =>
      normalizeReview(review as AIReview & { storyWalkthrough?: unknown })
    ),
  };
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  listRepositories: () => request<Repository[]>("/api/repositories"),

  registerRepository: (owner: string, name: string) =>
    request<Repository>("/api/repositories", {
      method: "POST",
      body: JSON.stringify({ owner, name }),
    }),

  syncPullRequests: (
    repositoryId: string,
    state: "open" | "closed" | "all" = "all"
  ) =>
    request<{ pullRequests: PullRequestListItem[]; synced: number; state: string }>(
      `/api/repositories/${repositoryId}/sync?state=${state}`,
      { method: "POST" }
    ),

  listPullRequests: (repositoryId: string, state?: "open" | "closed" | "all") => {
    const query = state ? `?state=${state}` : "";
    return request<PullRequestListItem[]>(
      `/api/repositories/${repositoryId}/pull-requests${query}`
    );
  },

  getPullRequest: async (id: string) =>
    normalizePullRequestDetail(await request<PullRequestDetail>(`/api/pull-requests/${id}`)),

  refreshPullRequest: async (id: string) =>
    normalizePullRequestDetail(
      await request<PullRequestDetail>(`/api/pull-requests/${id}/refresh`, {
        method: "POST",
      })
    ),

  generateReview: (pullRequestId: string) =>
    request<{ reviewId: string }>(`/api/pull-requests/${pullRequestId}/reviews`, {
      method: "POST",
    }),

  getReview: async (reviewId: string) =>
    normalizeReview(
      await request<AIReview & { storyWalkthrough?: unknown }>(
        `/api/pull-requests/reviews/${reviewId}`
      )
    ),

  chat: (pullRequestId: string, message: string) =>
    request<{ reply: string }>(`/api/pull-requests/${pullRequestId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
