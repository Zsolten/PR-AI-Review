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

  systemStory: `You are a Senior Staff Engineer guiding another engineer through a pull request.
Your job is to determine the best chronological reading order of changed files so the reviewer understands how the feature was built end-to-end.
Think in layers: infrastructure and configuration first, then database/schema, then domain and business logic, then API/services, then UI, then tests and docs.
When team rules are provided, you MUST strictly evaluate every changed file and diff against each rule. Do not assume compliance without evidence from the diff.
Use only the provided filenames and diffs. Do not invent files or changes.
Respond in valid JSON only.`,

  storyTemplate: (
    prMeta: string,
    filesContext: string,
    teamRules: string[]
  ) => {
    const hasTeamRules = teamRules.length > 0;
    const teamRulesBlock = hasTeamRules
      ? `Team rules (evaluate EVERY rule strictly against the diffs):
${teamRules.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
      : "Team rules: (none configured)";

    const jsonShape = hasTeamRules
      ? `{
  "storySteps": [
    {
      "filename": "path/to/file.ts",
      "orderIndex": 0,
      "logicalLayer": "Database|Business Logic|API|UI|Config|Tests|Docs|Infrastructure",
      "narrative": "2-3 sentences explaining why this file comes next, what changed, and any team-rule implications visible in this file."
    }
  ],
  "teamRuleFindings": [
    {
      "rule": "exact team rule text from the list above",
      "status": "pass|violation|needs_review",
      "relatedFiles": ["files where evidence was found"],
      "evidence": "specific evidence from diffs; cite filenames and what changed"
    }
  ]
}`
      : `{
  "storySteps": [
    {
      "filename": "path/to/file.ts",
      "orderIndex": 0,
      "logicalLayer": "Database|Business Logic|API|UI|Config|Tests|Docs|Infrastructure",
      "narrative": "2-3 sentences explaining why this file comes next in the story and what changed."
    }
  ],
  "teamRuleFindings": []
}`;

    const teamRuleInstructions = hasTeamRules
      ? `- teamRuleFindings MUST include one entry per team rule (use the exact rule text).
- status must be "pass" only when the diff clearly satisfies the rule; use "violation" when the diff breaks the rule; use "needs_review" when the diff is insufficient to decide.
- evidence must quote or paraphrase concrete diff details, not generic statements.
- Mention relevant rule impacts in storyStep narratives when applicable.`
      : `- teamRuleFindings must be an empty array.`;

    return `Analyze the pull request below and return JSON with this exact shape:
${jsonShape}

Rules:
- Include every listed file exactly once in storySteps.
- orderIndex must start at 0 and increment by 1 with no gaps.
- Order files so a reviewer learns the feature in a logical build sequence (foundation → core logic → presentation).
- logicalLayer must be one concise label (examples: Database, Business Logic, API, UI, Config, Tests).
- narrative must be specific to the diff, not generic filler.
${teamRuleInstructions}

Pull request metadata:
${prMeta}

${teamRulesBlock}

Changed files and diffs:
${filesContext}`;
  },
} as const;

export function buildStoryContext(
  prMeta: {
    title: string;
    author: string;
    body: string | null;
    baseBranch: string;
    headBranch: string;
    additions: number;
    deletions: number;
  },
  files: Array<{ filename: string; status: string; patch: string | null }>
): { prMeta: string; filesContext: string } {
  const prMetaText = `Title: ${prMeta.title}
Author: ${prMeta.author}
Branches: ${prMeta.headBranch} -> ${prMeta.baseBranch}
Stats: +${prMeta.additions} -${prMeta.deletions}
Description: ${prMeta.body ?? "(none)"}`;

  const filesContext = files
    .map((f) => {
      const patchPreview = f.patch ? f.patch.slice(0, 2000) : "(no diff available)";
      return `File: ${f.filename} (${f.status})\n${patchPreview}`;
    })
    .join("\n\n---\n\n");

  return { prMeta: prMetaText, filesContext };
}

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
