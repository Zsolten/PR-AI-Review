import type {
  AIReview,
  PullRequestDetail,
  PullRequestListItem,
  Repository,
  RepositoryIndexResult,
  StoryWalkthrough,
  TeamRule,
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

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function parseStoryWalkthrough(data: unknown): StoryWalkthrough | null {
  if (Array.isArray(data)) {
    const steps = data.filter((step): step is StoryWalkthrough["storySteps"][number] => {
      if (!step || typeof step !== "object") return false;
      const s = step as Record<string, unknown>;
      return (
        typeof s.filename === "string" &&
        typeof s.orderIndex === "number" &&
        typeof s.logicalLayer === "string" &&
        typeof s.narrative === "string"
      );
    });
    return steps.length > 0
      ? { storySteps: steps.sort((a, b) => a.orderIndex - b.orderIndex), teamRuleFindings: [] }
      : null;
  }

  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;

  const storySteps = Array.isArray(payload.storySteps)
    ? payload.storySteps.filter((step): step is StoryWalkthrough["storySteps"][number] => {
        if (!step || typeof step !== "object") return false;
        const s = step as Record<string, unknown>;
        return (
          typeof s.filename === "string" &&
          typeof s.orderIndex === "number" &&
          typeof s.logicalLayer === "string" &&
          typeof s.narrative === "string"
        );
      })
    : [];

  if (storySteps.length === 0) return null;

  const teamRuleFindings = Array.isArray(payload.teamRuleFindings)
    ? payload.teamRuleFindings.filter((f): f is StoryWalkthrough["teamRuleFindings"][number] => {
        if (!f || typeof f !== "object") return false;
        const finding = f as Record<string, unknown>;
        return (
          typeof finding.rule === "string" &&
          typeof finding.status === "string" &&
          Array.isArray(finding.relatedFiles) &&
          finding.relatedFiles.every((file) => typeof file === "string") &&
          typeof finding.evidence === "string"
        );
      })
    : [];

  const relatedContext = Array.isArray(payload.relatedContext)
    ? payload.relatedContext.filter((r): r is NonNullable<StoryWalkthrough["relatedContext"]>[number] => {
        if (!r || typeof r !== "object") return false;
        const item = r as Record<string, unknown>;
        return typeof item.path === "string" && typeof item.similarity === "number";
      })
    : undefined;

  return {
    storySteps: storySteps.sort((a, b) => a.orderIndex - b.orderIndex),
    teamRuleFindings,
    relatedContext,
  };
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

  listTeamRules: (repositoryId: string) =>
    request<TeamRule[]>(`/api/repositories/${repositoryId}/team-rules`),

  createTeamRule: (repositoryId: string, content: string) =>
    request<TeamRule>(`/api/repositories/${repositoryId}/team-rules`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  updateTeamRule: (
    repositoryId: string,
    ruleId: string,
    data: { content?: string; enabled?: boolean }
  ) =>
    request<TeamRule>(`/api/repositories/${repositoryId}/team-rules/${ruleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteTeamRule: (repositoryId: string, ruleId: string) =>
    request<void>(`/api/repositories/${repositoryId}/team-rules/${ruleId}`, {
      method: "DELETE",
    }),

  indexRepository: (repositoryId: string) =>
    request<RepositoryIndexResult>(`/api/repositories/${repositoryId}/index`, {
      method: "POST",
    }),

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
