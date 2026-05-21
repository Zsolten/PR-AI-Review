import { prisma } from "../../db/client.js";
import { NotFoundError } from "../../utils/errors.js";
import type { GitHubService } from "../github/github.service.js";
import type { GitHubPullRequestSummary } from "../github/types.js";

interface UpsertWebhookInput {
  repository: {
    githubId: number | string;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
  };
  pullRequest: {
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
  };
  syncFiles?: boolean;
}

export class PullRequestService {
  constructor(private githubService: GitHubService) {}

  async registerRepository(owner: string, name: string) {
    const repoData = await this.githubService.getRepository(owner, name);

    return prisma.repository.upsert({
      where: { fullName: repoData.fullName },
      create: repoData,
      update: {
        defaultBranch: repoData.defaultBranch,
      },
    });
  }

  async listRepositories() {
    return prisma.repository.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { pullRequests: true } },
      },
    });
  }

  async syncPullRequests(
    repositoryId: string,
    state: "open" | "closed" | "all" = "all"
  ) {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new NotFoundError("Repository not found");

    const prs = await this.githubService.listPullRequests(
      { owner: repo.owner, name: repo.name },
      state
    );

    const repoInput = { owner: repo.owner, name: repo.name };

    for (const listed of prs) {
      // List endpoint often returns additions/deletions as 0 — fetch full PR + files
      const full = await this.githubService.getPullRequest(repoInput, listed.number);
      await this.upsertPullRequest(repo.id, full, true);
    }

    const stored = await this.listPullRequests(repositoryId, state);
    return { pullRequests: stored, synced: prs.length, state };
  }

  async upsertFromWebhook(input: UpsertWebhookInput) {
    const repo = await prisma.repository.upsert({
      where: { fullName: input.repository.fullName },
      create: {
        githubId: String(input.repository.githubId),
        owner: input.repository.owner,
        name: input.repository.name,
        fullName: input.repository.fullName,
        defaultBranch: input.repository.defaultBranch,
      },
      update: {
        defaultBranch: input.repository.defaultBranch,
      },
    });

    const pr = await prisma.pullRequest.upsert({
      where: {
        repositoryId_number: {
          repositoryId: repo.id,
          number: input.pullRequest.number,
        },
      },
      create: this.mapPrToCreate(repo.id, input.pullRequest),
      update: this.mapPrToUpdate(input.pullRequest),
    });

    if (input.syncFiles) {
      await this.syncFiles(repo, pr.number, pr.id);
    }

    return pr;
  }

  private async upsertPullRequest(
    repositoryId: string,
    pr: GitHubPullRequestSummary,
    syncFiles: boolean
  ) {
    const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
    if (!repo) throw new NotFoundError("Repository not found");

    const record = await prisma.pullRequest.upsert({
      where: {
        repositoryId_number: { repositoryId, number: pr.number },
      },
      create: this.mapPrToCreate(repositoryId, pr),
      update: this.mapPrToUpdate(pr),
    });

    if (syncFiles) {
      await this.syncFiles(repo, pr.number, record.id);
    }

    return record;
  }

  private async syncFiles(
    repo: { owner: string; name: string },
    prNumber: number,
    pullRequestId: string
  ) {
    const files = await this.githubService.getPullRequestFiles(
      { owner: repo.owner, name: repo.name },
      prNumber
    );

    await prisma.pullRequestFile.deleteMany({ where: { pullRequestId } });

    if (files.length > 0) {
      await prisma.pullRequestFile.createMany({
        data: files.map((f) => ({
          pullRequestId,
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch?.slice(0, 50000) ?? null,
        })),
      });

      const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
      const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

      await prisma.pullRequest.update({
        where: { id: pullRequestId },
        data: {
          additions: totalAdditions,
          deletions: totalDeletions,
          changedFiles: files.length,
        },
      });
    }
  }

  async listPullRequests(
    repositoryId: string,
    state?: "open" | "closed" | "all"
  ) {
    return prisma.pullRequest.findMany({
      where: {
        repositoryId,
        ...(state && state !== "all" ? { state } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { reviews: true } },
      },
    });
  }

  async getPullRequestDetail(id: string) {
    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: {
        repository: true,
        files: { orderBy: { filename: "asc" } },
        reviews: {
          orderBy: { createdAt: "desc" },
          include: { comments: true },
          take: 5,
        },
        chatMessages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });

    if (!pr) throw new NotFoundError("Pull request not found");
    return pr;
  }

  async refreshPullRequest(id: string) {
    const pr = await prisma.pullRequest.findUnique({
      where: { id },
      include: { repository: true },
    });
    if (!pr) throw new NotFoundError("Pull request not found");

    const fresh = await this.githubService.getPullRequest(
      { owner: pr.repository.owner, name: pr.repository.name },
      pr.number
    );

    await prisma.pullRequest.update({
      where: { id },
      data: this.mapPrToUpdate(fresh),
    });

    await this.syncFiles(pr.repository, pr.number, pr.id);
    return this.getPullRequestDetail(id);
  }

  private mapPrToCreate(
    repositoryId: string,
    pr: UpsertWebhookInput["pullRequest"] | GitHubPullRequestSummary
  ) {
    return {
      repositoryId,
      githubId: String(pr.id),
      number: pr.number,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      htmlUrl: pr.html_url,
    };
  }

  private mapPrToUpdate(
    pr: UpsertWebhookInput["pullRequest"] | GitHubPullRequestSummary
  ) {
    return {
      title: pr.title,
      body: pr.body,
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      htmlUrl: pr.html_url,
    };
  }
}
