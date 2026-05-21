import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AppContainer } from "../services/container.js";

export function webhooksRoutes(container: AppContainer) {
  const router = Router();

  router.post(
    "/github",
    asyncHandler(async (req, res) => {
      const result = await container.webhookHandler.handle(req);
      res.json(result);
    })
  );

  return router;
}
