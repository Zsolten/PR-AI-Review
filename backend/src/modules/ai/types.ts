export interface ReviewLLMResult {
  summary: string;
  riskAnalysis: string;
  comments: Array<{
    category: string;
    file: string | null;
    line: number | null;
    message: string;
    severity: string;
  }>;
}

export type RuleComplianceStatus = "pass" | "violation" | "needs_review";

export interface StoryStep {
  filename: string;
  orderIndex: number;
  logicalLayer: string;
  narrative: string;
}

export interface TeamRuleFinding {
  rule: string;
  status: RuleComplianceStatus;
  relatedFiles: string[];
  evidence: string;
}

export interface StoryWalkthroughPayload {
  storySteps: StoryStep[];
  teamRuleFindings: TeamRuleFinding[];
}

export interface StoryLLMResult {
  storySteps: StoryStep[];
  teamRuleFindings: TeamRuleFinding[];
}

export interface StoryFileInput {
  filename: string;
  status: string;
  patch: string | null;
}
