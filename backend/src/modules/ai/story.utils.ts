import type { StoryLLMResult, StoryStep } from "./types.js";

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

export function parseStoryWalkthrough(data: unknown): StoryStep[] {
  if (!Array.isArray(data)) return [];
  return data.filter(isStoryStep).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function validateStoryLLMResult(data: unknown): StoryLLMResult {
  if (!data || typeof data !== "object") {
    throw new Error("Story response must be a JSON object");
  }

  const payload = data as Record<string, unknown>;
  if (!Array.isArray(payload.storySteps)) {
    throw new Error("Story response must include a storySteps array");
  }

  const storySteps = parseStoryWalkthrough(payload.storySteps);
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

  return { storySteps };
}
