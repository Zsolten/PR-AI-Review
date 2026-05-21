export interface GitHubRepositoryInput {
  owner: string;
  name: string;
}

export interface GitHubPullRequestSummary {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  user: { login: string } | null;
  base: { ref: string };
  head: { ref: string };
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubPullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export type WebhookPullRequestAction = "opened" | "synchronize" | "reopened" | "closed";
