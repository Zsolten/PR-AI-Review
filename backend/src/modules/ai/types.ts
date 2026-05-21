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
