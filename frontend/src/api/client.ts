import type {
  AIReview,
  PullRequestDetail,
  PullRequestListItem,
  Repository,
} from "../types";

// Prefer Vite proxy in dev (empty base → same-origin /api)
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

  listPullRequests: (
    repositoryId: string,
    state?: "open" | "closed" | "all"
  ) => {
    const query = state ? `?state=${state}` : "";
    return request<PullRequestListItem[]>(
      `/api/repositories/${repositoryId}/pull-requests${query}`
    );
  },

  getPullRequest: (id: string) => request<PullRequestDetail>(`/api/pull-requests/${id}`),

  refreshPullRequest: (id: string) =>
    request<PullRequestDetail>(`/api/pull-requests/${id}/refresh`, { method: "POST" }),

  generateReview: (pullRequestId: string) =>
    request<{ reviewId: string }>(`/api/pull-requests/${pullRequestId}/reviews`, {
      method: "POST",
    }),

  getReview: (reviewId: string) => request<AIReview>(`/api/pull-requests/reviews/${reviewId}`),

  chat: (pullRequestId: string, message: string) =>
    request<{ reply: string }>(`/api/pull-requests/${pullRequestId}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
