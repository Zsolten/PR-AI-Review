export const AI_PROMPTS = {
  systemReview: `You are a senior software engineer performing pull request reviews.
Focus on practical, actionable feedback. Be concise and specific.
Prioritize: error handling gaps, bug risks, readability, security, and performance.
Respond in valid JSON only.`,

  reviewTemplate: (context: string) => `Review this pull request and return JSON with this exact shape:
{
  "summary": "2-4 sentence overview of what changed and overall quality",
  "riskAnalysis": "bullet-style risks as a single string with newlines",
  "comments": [
    {
      "category": "ERROR_HANDLING|BUG_RISK|READABILITY|SECURITY|PERFORMANCE|GENERAL",
      "file": "optional filename or null",
      "line": null,
      "message": "specific actionable comment",
      "severity": "info|warning|critical"
    }
  ]
}
Provide 4-8 comments across different categories.

Pull request context:
${context}`,

  chatSystem: `You are an AI assistant helping developers understand pull requests.
Answer based only on the provided PR context. Be clear and helpful.
If unsure, say what additional context would help.`,

  chatUser: (context: string, question: string, history: string) => `PR Context:
${context}

Recent conversation:
${history || "(none)"}

User question: ${question}`,
} as const;

export function buildPrContext(input: {
  title: string;
  author: string;
  body: string | null;
  baseBranch: string;
  headBranch: string;
  additions: number;
  deletions: number;
  files: Array<{ filename: string; status: string; patch: string | null }>;
}): string {
  const fileSummaries = input.files
    .map((f) => {
      const patchPreview = f.patch
        ? f.patch.slice(0, 2000)
        : "(no diff available)";
      return `File: ${f.filename} (${f.status})\n${patchPreview}`;
    })
    .join("\n\n---\n\n");

  return `Title: ${input.title}
Author: ${input.author}
Branches: ${input.headBranch} -> ${input.baseBranch}
Stats: +${input.additions} -${input.deletions}
Description: ${input.body ?? "(none)"}

Changed files:
${fileSummaries}`;
}
