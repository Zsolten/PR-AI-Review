import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AppContainer } from "../services/container.js";

const chatSchema = z.object({
  message: z.string().min(1),
});

export function pullRequestsRoutes(container: AppContainer) {
  const router = Router();

  router.get(
    "/reviews/:reviewId",
    asyncHandler(async (req, res) => {
      const review = await container.reviewOrchestrator.getReview(req.params.reviewId);
      res.json(review);
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const pr = await container.pullRequestService.getPullRequestDetail(req.params.id);
      res.json(pr);
    })
  );

  router.post(
    "/:id/refresh",
    asyncHandler(async (req, res) => {
      const pr = await container.pullRequestService.refreshPullRequest(req.params.id);
      res.json(pr);
    })
  );

  router.post(
    "/:id/reviews",
    asyncHandler(async (req, res) => {
      const result = await container.reviewOrchestrator.generateReviewAsync(req.params.id);
      res.status(202).json(result);
    })
  );

  router.post(
    "/:id/chat",
    asyncHandler(async (req, res) => {
      const { message } = chatSchema.parse(req.body);
      const result = await container.reviewOrchestrator.chat(req.params.id, message);
      res.json(result);
    })
  );

  return router;
}
