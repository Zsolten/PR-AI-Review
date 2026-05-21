import type { Request } from "express";
import type { Env } from "../../config/env.js";
import { verifyGitHubSignature } from "../../utils/githubWebhook.js";
import { BadRequestError } from "../../utils/errors.js";
import type { PullRequestService } from "../pullRequests/pullRequest.service.js";

interface WebhookPayload {
  action?: string;
  repository?: {
    id: number;
    full_name: string;
    owner: { login: string };
    name: string;
    default_branch?: string;
  };
  pull_request?: {
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
}

export class GitHubWebhookHandler {
  constructor(
    private env: Env,
    private pullRequestService: PullRequestService
  ) {}

  async handle(req: Request): Promise<{ received: boolean; processed?: boolean }> {
    const event = req.header("x-github-event");
    const signature = req.header("x-hub-signature-256");
    const rawBody = (req as Request & { rawBody?: string }).rawBody;

    if (!rawBody) {
      throw new BadRequestError("Missing raw body for webhook verification");
    }

    const secret = this.env.GITHUB_WEBHOOK_SECRET;
    if (secret && !verifyGitHubSignature(rawBody, signature, secret)) {
      throw new BadRequestError("Invalid webhook signature");
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;

    if (event === "pull_request" && payload.pull_request && payload.repository) {
      const action = payload.action;
      if (action === "opened" || action === "synchronize" || action === "reopened") {
        const [owner, name] = payload.repository.full_name.split("/");
        await this.pullRequestService.upsertFromWebhook({
          repository: {
            githubId: String(payload.repository.id),
            owner,
            name,
            fullName: payload.repository.full_name,
            defaultBranch: payload.repository.default_branch ?? "main",
          },
          pullRequest: payload.pull_request,
          syncFiles: true,
        });
        return { received: true, processed: true };
      }
    }

    return { received: true, processed: false };
  }
}
