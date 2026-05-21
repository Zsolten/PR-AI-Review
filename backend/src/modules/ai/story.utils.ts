import type {
  RuleComplianceStatus,
  StoryLLMResult,
  StoryStep,
  StoryWalkthroughPayload,
  TeamRuleFinding,
} from "./types.js";

const RULE_STATUSES: RuleComplianceStatus[] = ["pass", "violation", "needs_review"];

function isStoryStep(value: unknown): value is StoryStep {
  if (!value || typeof value !== "object") return false;
  const step = value as Record<string, unknown>;
  return (
    typeof step.filename === "string" &&
    typeof step.orderIndex === "number" &&
    Number.isFinite(step.orderIndex) &&
    typeof step.logicalLayer === "string" &&
    typeof step.narrative === "string"
  );
}

function isTeamRuleFinding(value: unknown): value is TeamRuleFinding {
  if (!value || typeof value !== "object") return false;
  const finding = value as Record<string, unknown>;
  return (
    typeof finding.rule === "string" &&
    typeof finding.status === "string" &&
    RULE_STATUSES.includes(finding.status as RuleComplianceStatus) &&
    Array.isArray(finding.relatedFiles) &&
    finding.relatedFiles.every((f) => typeof f === "string") &&
    typeof finding.evidence === "string"
  );
}

export function parseStorySteps(data: unknown): StoryStep[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isStoryStep).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function parseTeamRuleFindings(data: unknown): TeamRuleFinding[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isTeamRuleFinding);
}

export function parseStoryWalkthroughPayload(data: unknown): StoryWalkthroughPayload | null {
  if (Array.isArray(data)) {
    const storySteps = parseStorySteps(data);
    return storySteps.length > 0 ? { storySteps, teamRuleFindings: [] } : null;
  }

  if (!data || typeof data !== "object") return null;
  const payload = data as Record<string, unknown>;
  const storySteps = parseStorySteps(payload.storySteps);
  if (storySteps.length === 0) return null;

  return {
    storySteps,
    teamRuleFindings: parseTeamRuleFindings(payload.teamRuleFindings),
  };
}

export function validateStoryLLMResult(
  data: unknown,
  teamRules: string[]
): StoryLLMResult {
  if (!data || typeof data !== "object") {
    throw new Error("Story response must be a JSON object");
  }

  const payload = data as Record<string, unknown>;
  if (!Array.isArray(payload.storySteps)) {
    throw new Error("Story response must include a storySteps array");
  }

  const storySteps = parseStorySteps(payload.storySteps);
  if (storySteps.length === 0) {
    throw new Error("Story response must include at least one valid story step");
  }

  const filenames = new Set<string>();
  for (const step of storySteps) {
    if (filenames.has(step.filename)) {
      throw new Error(`Duplicate story step for file: ${step.filename}`);
    }
    filenames.add(step.filename);
  }

  const teamRuleFindings = parseTeamRuleFindings(payload.teamRuleFindings);

  if (teamRules.length > 0) {
    if (teamRuleFindings.length === 0) {
      throw new Error("Story response must include teamRuleFindings when team rules are provided");
    }

    for (const rule of teamRules) {
      const matched = teamRuleFindings.some(
        (f) =>
          f.rule === rule ||
          f.rule.includes(rule) ||
          rule.includes(f.rule)
      );
      if (!matched) {
        throw new Error(`Story response must evaluate team rule: ${rule}`);
      }
    }
  }

  return { storySteps, teamRuleFindings };
}
