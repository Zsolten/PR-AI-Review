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

export interface StoryStep {
  filename: string;
  orderIndex: number;
  logicalLayer: string;
  narrative: string;
}

export interface StoryLLMResult {
  storySteps: StoryStep[];
}

export interface StoryFileInput {
  filename: string;
  status: string;
  patch: string | null;
}
