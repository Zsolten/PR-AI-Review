import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AppContainer } from "../services/container.js";

const registerSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
});

const prStateSchema = z.enum(["open", "closed", "all"]);

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

  return router;
}
