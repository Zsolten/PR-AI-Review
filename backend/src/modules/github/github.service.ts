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
    return prs as GitHubPullRequestSummary[];
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
}
