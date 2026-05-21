import { Router } from "express";
import type { AppContainer } from "../services/container.js";
import { repositoriesRoutes } from "./repositories.routes.js";
import { pullRequestsRoutes } from "./pullRequests.routes.js";
import { webhooksRoutes } from "./webhooks.routes.js";

export function createApiRouter(container: AppContainer) {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.use("/repositories", repositoriesRoutes(container));
  router.use("/pull-requests", pullRequestsRoutes(container));
  router.use("/webhooks", webhooksRoutes(container));

  return router;
}
