export interface Repository {
  id: string;
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  indexedAt: string | null;
  indexBranch: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { pullRequests: number };
}

export interface RepositoryIndexResult {
  repositoryId: string;
  branch: string;
  filesProcessed: number;
  chunksStored: number;
  skippedPaths: number;
  quotaLimited?: boolean;
  message?: string;
}

export interface RelatedContextSummary {
  path: string;
  similarity: number;
}

export interface PullRequestListItem {
  id: string;
  number: number;
  title: string;
  state: string;
  author: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  updatedAt: string;
  _count?: { reviews: number };
}

export type AICommentCategory =
  | "ERROR_HANDLING"
  | "BUG_RISK"
  | "READABILITY"
  | "SECURITY"
  | "PERFORMANCE"
  | "GENERAL";

export interface AIComment {
  id: string;
  category: AICommentCategory;
  file: string | null;
  line: number | null;
  message: string;
  severity: string;
}

export interface StoryStep {
  filename: string;
  orderIndex: number;
  logicalLayer: string;
  narrative: string;
}

export type RuleComplianceStatus = "pass" | "violation" | "needs_review";

export interface TeamRuleFinding {
  rule: string;
  status: RuleComplianceStatus;
  relatedFiles: string[];
  evidence: string;
}

export interface StoryWalkthrough {
  storySteps: StoryStep[];
  teamRuleFindings: TeamRuleFinding[];
  relatedContext?: RelatedContextSummary[];
}

export interface TeamRule {
  id: string;
  content: string;
  enabled: boolean;
  repositoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIReview {
  id: string;
  summary: string | null;
  riskAnalysis: string | null;
  storyWalkthrough: StoryWalkthrough | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  comments: AIComment[];
  createdAt: string;
}

export interface PullRequestFile {
  id: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface PullRequestDetail {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  htmlUrl: string | null;
  repository: Repository;
  files: PullRequestFile[];
  reviews: AIReview[];
  chatMessages: ChatMessage[];
}
