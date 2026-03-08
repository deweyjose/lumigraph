export type WorkflowStepDraft = {
  key: string;
  title: string;
  kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
  instructions: string;
  toolName: string;
  toolInputTemplateJson: unknown | null;
  expectedArtifactType:
    | "POST"
    | "INTEGRATION_SET"
    | "ASSET"
    | "DOWNLOAD_JOB"
    | "";
};

export type WorkflowDefinitionDraft = {
  title: string;
  description: string;
  subjectType: "POST" | "INTEGRATION_SET" | "";
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  steps: WorkflowStepDraft[];
};

export function createWorkflowStep(seed: number): WorkflowStepDraft {
  return {
    key: `step-${seed}`,
    title: "",
    kind: "INSTRUCTION",
    instructions: "",
    toolName: "",
    toolInputTemplateJson: null,
    expectedArtifactType: "",
  };
}

export function appendWorkflowStep(
  steps: WorkflowStepDraft[],
  seed: number
): WorkflowStepDraft[] {
  return [...steps, createWorkflowStep(seed)];
}

export function removeWorkflowStep(
  steps: WorkflowStepDraft[],
  index: number
): WorkflowStepDraft[] {
  return steps.filter((_, stepIndex) => stepIndex !== index);
}

export function moveWorkflowStep(
  steps: WorkflowStepDraft[],
  index: number,
  direction: -1 | 1
): WorkflowStepDraft[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= steps.length) return steps;
  if (nextIndex < 0 || nextIndex >= steps.length) return steps;

  const nextSteps = [...steps];
  const current = nextSteps[index];
  const target = nextSteps[nextIndex];
  if (!current || !target) return steps;

  nextSteps[index] = target;
  nextSteps[nextIndex] = current;
  return nextSteps;
}

export function toWorkflowDefinitionPayload(draft: WorkflowDefinitionDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    subjectType: draft.subjectType || null,
    status: draft.status,
    steps: draft.steps.map((step, index) => ({
      key: step.key.trim(),
      position: index + 1,
      title: step.title.trim(),
      kind: step.kind,
      instructions: step.instructions.trim() || null,
      toolName: step.kind === "TOOL_CALL" ? step.toolName.trim() || null : null,
      toolInputTemplateJson:
        step.kind === "TOOL_CALL" ? step.toolInputTemplateJson ?? null : null,
      expectedArtifactType: step.expectedArtifactType || null,
    })),
  };
}
