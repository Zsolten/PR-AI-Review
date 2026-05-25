import { Octokit } from "@octokit/rest";
import type { Env } from "../../config/env.js";
import type {
  GitHubPullRequestFile,
  GitHubPullRequestSummary,
  GitHubRepositoryInput,
} from "./types.js";
import { BadRequestError } from "../../utils/errors.js";

export class GitHubService {
  private octokit: Octokit | null;

  constructor(private env: Env) {
    this.octokit = env.GITHUB_PAT
      ? new Octokit({ auth: env.GITHUB_PAT })
      : null;
  }

  private requireClient(): Octokit {
    if (!this.octokit) {
      throw new BadRequestError(
        "GitHub PAT is not configured. Set GITHUB_PAT in your environment."
      );
    }
    return this.octokit;
  }

  async getRepository(owner: string, name: string) {
    const client = this.requireClient();
    const { data } = await client.repos.get({ owner, repo: name });
    return {
      githubId: String(data.id),
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      defaultBranch: data.default_branch,
    };
  }

  async listPullRequests(
    repo: GitHubRepositoryInput,
    state: "open" | "closed" | "all" = "all"
  ): Promise<GitHubPullRequestSummary[]> {
    const client = this.requireClient();
    const prs = await client.paginate(client.pulls.list, {
      owner: repo.owner,
      repo: repo.name,
      state,
      per_page: 100,
      sort: "updated",
      direction: "desc",
    });
    return prs as unknown as GitHubPullRequestSummary[];
  }

  async getPullRequest(
    repo: GitHubRepositoryInput,
    number: number
  ): Promise<GitHubPullRequestSummary> {
    const client = this.requireClient();
    const { data } = await client.pulls.get({
      owner: repo.owner,
      repo: repo.name,
      pull_number: number,
    });
    return data as GitHubPullRequestSummary;
  }

  async getPullRequestFiles(
    repo: GitHubRepositoryInput,
    number: number
  ): Promise<GitHubPullRequestFile[]> {
    const client = this.requireClient();
    const { data } = await client.pulls.listFiles({
      owner: repo.owner,
      repo: repo.name,
      pull_number: number,
      per_page: 100,
    });
    return data as GitHubPullRequestFile[];
  }

  /**
   * Recursively lists blob paths on a branch (used for RAG ingestion).
   * GitHub tree API is shallow per call; we paginate and filter to blobs only.
   */
  async listRepositoryFilePaths(
    repo: GitHubRepositoryInput,
    branch: string,
    maxFiles: number
  ): Promise<string[]> {
    const client = this.requireClient();
    const { data: refData } = await client.git.getRef({
      owner: repo.owner,
      repo: repo.name,
      ref: `heads/${branch}`,
    });
    const commitSha = refData.object.sha;

    const { data: treeData } = await client.git.getTree({
      owner: repo.owner,
      repo: repo.name,
      tree_sha: commitSha,
      recursive: "1",
    });

    const paths: string[] = [];
    for (const entry of treeData.tree) {
      if (entry.type !== "blob" || !entry.path) continue;
      paths.push(entry.path);
      if (paths.length >= maxFiles) break;
    }

    return paths;
  }

  /** Fetches raw file content at a path on the given branch (base64-decoded). */
  async getFileContent(
    repo: GitHubRepositoryInput,
    path: string,
    branch: string
  ): Promise<string | null> {
    const client = this.requireClient();
    try {
      const { data } = await client.repos.getContent({
        owner: repo.owner,
        repo: repo.name,
        path,
        ref: branch,
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
        return null;
      }

      if (typeof data.content !== "string") return null;
      const encoding = data.encoding ?? "base64";
      if (encoding !== "base64") return null;

      return Buffer.from(data.content, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
}
