import { PrismaClient, AIReviewStatus, AICommentCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const repo = await prisma.repository.upsert({
    where: { fullName: "acme/demo-app" },
    create: {
      githubId: "10001",
      owner: "acme",
      name: "demo-app",
      fullName: "acme/demo-app",
      defaultBranch: "main",
    },
    update: {},
  });

  const pr = await prisma.pullRequest.upsert({
    where: {
      repositoryId_number: { repositoryId: repo.id, number: 42 },
    },
    create: {
      repositoryId: repo.id,
      githubId: "20042",
      number: 42,
      title: "Add user authentication middleware",
      body: "Implements JWT middleware and session helpers for the API layer.",
      state: "open",
      author: "jane-dev",
      baseBranch: "main",
      headBranch: "feature/auth-middleware",
      additions: 248,
      deletions: 31,
      changedFiles: 5,
      htmlUrl: "https://github.com/acme/demo-app/pull/42",
    },
    update: {},
  });

  await prisma.pullRequestFile.deleteMany({ where: { pullRequestId: pr.id } });
  await prisma.pullRequestFile.createMany({
    data: [
      {
        pullRequestId: pr.id,
        filename: "src/middleware/auth.ts",
        status: "added",
        additions: 120,
        deletions: 0,
        changes: 120,
        patch: `@@ -0,0 +1,40 @@
+export async function authMiddleware(req, res, next) {
+  const token = req.headers.authorization;
+  if (!token) return res.status(401).json({ error: "Unauthorized" });
+  next();
+}`,
      },
      {
        pullRequestId: pr.id,
        filename: "src/routes/users.ts",
        status: "modified",
        additions: 45,
        deletions: 12,
        changes: 57,
        patch: `@@ -10,6 +10,12 @@
 router.get("/profile", async (req, res) => {
+  if (!req.user) throw new Error("missing user");
   return res.json(req.user);
 });`,
      },
    ],
  });

  const existingReview = await prisma.aIReview.findFirst({
    where: { pullRequestId: pr.id },
  });

  if (!existingReview) {
    const review = await prisma.aIReview.create({
      data: {
        pullRequestId: pr.id,
        status: AIReviewStatus.COMPLETED,
        summary:
          "This PR introduces JWT auth middleware and wires it into user routes. Overall direction is sound, but error handling and token validation need hardening before merge.",
        riskAnalysis:
          "- Missing token format validation may allow malformed headers\n- Unhandled exceptions in profile route could crash the process\n- No refresh/revocation strategy documented",
        storyWalkthrough: [
          {
            filename: "src/middleware/auth.ts",
            orderIndex: 0,
            logicalLayer: "Business Logic",
            narrative:
              "Start with the auth middleware where tokens are parsed and validated. This is the security gate every protected route will rely on.",
          },
          {
            filename: "src/routes/users.ts",
            orderIndex: 1,
            logicalLayer: "API",
            narrative:
              "Next, review the route wiring that applies the middleware to user endpoints. Here you can see how the new auth flow surfaces to API consumers.",
          },
        ],
      },
    });

    await prisma.aIComment.createMany({
      data: [
        {
          reviewId: review.id,
          category: AICommentCategory.ERROR_HANDLING,
          file: "src/middleware/auth.ts",
          message: "Validate Bearer token format before passing to verification logic.",
          severity: "warning",
        },
        {
          reviewId: review.id,
          category: AICommentCategory.BUG_RISK,
          file: "src/routes/users.ts",
          message: "Throwing a raw Error in the route may bypass Express error middleware.",
          severity: "critical",
        },
        {
          reviewId: review.id,
          category: AICommentCategory.SECURITY,
          file: "src/middleware/auth.ts",
          message: "Consider constant-time comparison and explicit expiry checks for JWT claims.",
          severity: "warning",
        },
        {
          reviewId: review.id,
          category: AICommentCategory.READABILITY,
          file: "src/middleware/auth.ts",
          message: "Extract token parsing into a small helper to simplify the middleware.",
          severity: "info",
        },
      ],
    });
  }

  await prisma.chatMessage.deleteMany({ where: { pullRequestId: pr.id } });
  await prisma.chatMessage.createMany({
    data: [
      {
        pullRequestId: pr.id,
        role: "user",
        content: "What are the main risks in this PR?",
      },
      {
        pullRequestId: pr.id,
        role: "assistant",
        content:
          "The main risks are insufficient auth token validation, potential unhandled errors in the profile route, and missing documentation around session lifecycle.",
      },
    ],
  });

  console.log("Seed complete:", { repo: repo.fullName, pr: pr.number });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
