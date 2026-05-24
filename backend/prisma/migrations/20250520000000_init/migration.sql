-- CreateEnum
CREATE TYPE "AIReviewStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE "AICommentCategory" AS ENUM (
  'ERROR_HANDLING',
  'BUG_RISK',
  'READABILITY',
  'SECURITY',
  'PERFORMANCE',
  'GENERAL'
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamRule" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PullRequest" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headBranch" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changedFiles" INTEGER NOT NULL DEFAULT 0,
    "htmlUrl" TEXT,
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PullRequestFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changes" INTEGER NOT NULL DEFAULT 0,
    "patch" TEXT,
    "pullRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PullRequestFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIReview" (
    "id" TEXT NOT NULL,
    "summary" TEXT,
    "riskAnalysis" TEXT,
    "storyWalkthrough" JSONB,
    "status" "AIReviewStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "pullRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIComment" (
    "id" TEXT NOT NULL,
    "category" "AICommentCategory" NOT NULL,
    "file" TEXT,
    "line" INTEGER,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "reviewId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubId_key" ON "Repository"("githubId");
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");
CREATE INDEX "Repository_owner_name_idx" ON "Repository"("owner", "name");

CREATE INDEX "TeamRule_repositoryId_enabled_idx" ON "TeamRule"("repositoryId", "enabled");

CREATE UNIQUE INDEX "PullRequest_repositoryId_number_key" ON "PullRequest"("repositoryId", "number");
CREATE INDEX "PullRequest_repositoryId_state_idx" ON "PullRequest"("repositoryId", "state");

CREATE UNIQUE INDEX "PullRequestFile_pullRequestId_filename_key" ON "PullRequestFile"("pullRequestId", "filename");

CREATE INDEX "AIReview_pullRequestId_createdAt_idx" ON "AIReview"("pullRequestId", "createdAt");

CREATE INDEX "AIComment_reviewId_idx" ON "AIComment"("reviewId");

CREATE INDEX "ChatMessage_pullRequestId_createdAt_idx" ON "ChatMessage"("pullRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "TeamRule" ADD CONSTRAINT "TeamRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PullRequestFile" ADD CONSTRAINT "PullRequestFile_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIReview" ADD CONSTRAINT "AIReview_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AIComment" ADD CONSTRAINT "AIComment_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AIReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
