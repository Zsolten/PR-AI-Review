import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AppContainer } from "../services/container.js";

const registerSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});

const prStateSchema = z.enum(["open", "closed", "all"]);

const teamRuleCreateSchema = z.object({
  content: z.string().min(1).max(2000),
});

const teamRuleUpdateSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  enabled: z.boolean().optional(),
});

export function repositoriesRoutes(container: AppContainer) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const repos = await container.pullRequestService.listRepositories();
      res.json(repos);
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { owner, name } = registerSchema.parse(req.body);
      const repo = await container.pullRequestService.registerRepository(owner, name);
      res.status(201).json(repo);
    })
  );

  router.post(
    "/:id/index",
    asyncHandler(async (req, res) => {
      const result = await container.ragIngestionService.indexRepository(req.params.id);
      res.json(result);
    })
  );

  router.post(
    "/:id/sync",
    asyncHandler(async (req, res) => {
      const state = prStateSchema.parse(
        typeof req.query.state === "string" ? req.query.state : "all"
      );
      const result = await container.pullRequestService.syncPullRequests(
        req.params.id,
        state
      );
      res.json(result);
    })
  );

  router.get(
    "/:id/pull-requests",
    asyncHandler(async (req, res) => {
      const state =
        typeof req.query.state === "string"
          ? prStateSchema.parse(req.query.state)
          : undefined;
      const prs = await container.pullRequestService.listPullRequests(
        req.params.id,
        state
      );
      res.json(prs);
    })
  );

  router.get(
    "/:id/team-rules",
    asyncHandler(async (req, res) => {
      const rules = await container.teamRulesService.listRules(req.params.id);
      res.json(rules);
    })
  );

  router.post(
    "/:id/team-rules",
    asyncHandler(async (req, res) => {
      const { content } = teamRuleCreateSchema.parse(req.body);
      const rule = await container.teamRulesService.createRule(req.params.id, content);
      res.status(201).json(rule);
    })
  );

  router.patch(
    "/:id/team-rules/:ruleId",
    asyncHandler(async (req, res) => {
      const data = teamRuleUpdateSchema.parse(req.body);
      const rule = await container.teamRulesService.updateRule(
        req.params.id,
        req.params.ruleId,
        data
      );
      res.json(rule);
    })
  );

  router.delete(
    "/:id/team-rules/:ruleId",
    asyncHandler(async (req, res) => {
      await container.teamRulesService.deleteRule(req.params.id, req.params.ruleId);
      res.status(204).send();
    })
  );

  return router;
}
