import { AIReviewStatus, AICommentCategory, type Prisma } from "@prisma/client";
import { prisma } from "../../db/client.js";
import { NotFoundError } from "../../utils/errors.js";
import { buildPrContext } from "../ai/prompts.js";
import type { GeminiService } from "../ai/gemini.service.js";
import type { PullRequestService } from "../pullRequests/pullRequest.service.js";

const CATEGORY_MAP: Record<string, AICommentCategory> = {
  ERROR_HANDLING: AICommentCategory.ERROR_HANDLING,
  BUG_RISK: AICommentCategory.BUG_RISK,
  READABILITY: AICommentCategory.READABILITY,
  SECURITY: AICommentCategory.SECURITY,
  PERFORMANCE: AICommentCategory.PERFORMANCE,
  GENERAL: AICommentCategory.GENERAL,
};

export class ReviewOrchestratorService {
  constructor(
    private geminiService: GeminiService,
    private pullRequestService: PullRequestService
  ) {}

  async generateReviewAsync(pullRequestId: string): Promise<{ reviewId: string }> {
    const pr = await prisma.pullRequest.findUnique({
      where: { id: pullRequestId },
      include: { files: true },
    });
    if (!pr) throw new NotFoundError("Pull request not found");

    const review = await prisma.aIReview.create({
      data: {
        pullRequestId,
        status: AIReviewStatus.PENDING,
      },
    });

    setImmediate(() => {
      void this.processReview(review.id, pullRequestId);
    });

    return { reviewId: review.id };
  }

  private async processReview(reviewId: string, pullRequestId: string) {
    try {
      await prisma.aIReview.update({
        where: { id: reviewId },
        data: { status: AIReviewStatus.PROCESSING },
      });

      const detail = await this.pullRequestService.getPullRequestDetail(pullRequestId);

      const context = buildPrContext({
        title: detail.title,
        author: detail.author,
        body: detail.body,
        baseBranch: detail.baseBranch,
        headBranch: detail.headBranch,
        additions: detail.additions,
        deletions: detail.deletions,
        files: detail.files.map((f) => ({
          filename: f.filename,
          status: f.status,
          patch: f.patch,
        })),
      });

      const result = await this.geminiService.generateReview(context);

      const comments: Prisma.AICommentCreateManyInput[] = result.comments.map((c) => ({
        reviewId,
        category: CATEGORY_MAP[c.category] ?? AICommentCategory.GENERAL,
        file: c.file,
        line: c.line,
        message: c.message,
        severity: c.severity,
      }));

      await prisma.$transaction([
        prisma.aIReview.update({
          where: { id: reviewId },
          data: {
            status: AIReviewStatus.COMPLETED,
            summary: result.summary,
            riskAnalysis: result.riskAnalysis,
          },
        }),
        prisma.aIComment.createMany({ data: comments }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.aIReview.update({
        where: { id: reviewId },
        data: {
          status: AIReviewStatus.FAILED,
          errorMessage: message,
        },
      });
    }
  }

  async getReview(reviewId: string) {
    const review = await prisma.aIReview.findUnique({
      where: { id: reviewId },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });
    if (!review) throw new NotFoundError("Review not found");
    return review;
  }

  async chat(pullRequestId: string, message: string) {
    const detail = await this.pullRequestService.getPullRequestDetail(pullRequestId);

    const userMessage = await prisma.chatMessage.create({
      data: { pullRequestId, role: "user", content: message },
    });

    const context = buildPrContext({
      title: detail.title,
      author: detail.author,
      body: detail.body,
      baseBranch: detail.baseBranch,
      headBranch: detail.headBranch,
      additions: detail.additions,
      deletions: detail.deletions,
      files: detail.files.slice(0, 8).map((f) => ({
        filename: f.filename,
        status: f.status,
        patch: f.patch,
      })),
    });

    const history = [...detail.chatMessages, userMessage]
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    try {
      const reply = await this.geminiService.chat(context, message, history);

      await prisma.chatMessage.create({
        data: { pullRequestId, role: "assistant", content: reply },
      });

      return { reply };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Chat failed";
      throw new Error(errMsg);
    }
  }
}
