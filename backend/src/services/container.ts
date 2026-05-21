import type { Env } from "../config/env.js";
import { GitHubService } from "../modules/github/github.service.js";
import { GitHubWebhookHandler } from "../modules/github/webhook.handler.js";
import { PullRequestService } from "../modules/pullRequests/pullRequest.service.js";
import { GeminiService } from "../modules/ai/gemini.service.js";
import { ReviewOrchestratorService } from "../modules/reviews/reviewOrchestrator.service.js";
import { TeamRulesService } from "../modules/teamRules/teamRules.service.js";

export function createContainer(env: Env) {
  const githubService = new GitHubService(env);
  const geminiService = new GeminiService(env);
  const pullRequestService = new PullRequestService(githubService);
  const teamRulesService = new TeamRulesService();
  const reviewOrchestrator = new ReviewOrchestratorService(
    geminiService,
    pullRequestService,
    teamRulesService
  );
  const webhookHandler = new GitHubWebhookHandler(env, pullRequestService);

  return {
    githubService,
    geminiService,
    pullRequestService,
    reviewOrchestrator,
    teamRulesService,
    webhookHandler,
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
