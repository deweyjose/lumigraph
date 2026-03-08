import { Prisma as PrismaClient } from "@prisma/client";
import { getPrisma, type Prisma } from "@lumigraph/db";
import { lumigraphTools } from "../tools/lumigraph";

const WORKFLOW_STEP_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_TOOL_NAMES: ReadonlySet<string> = new Set(
  lumigraphTools.map((tool) => tool.name)
);

type WorkflowDefinitionSummaryRecord = Prisma.WorkflowDefinitionGetPayload<{
  include: {
    _count: {
      select: { steps: true };
    };
  };
}>;

type WorkflowDefinitionRecord = Prisma.WorkflowDefinitionGetPayload<{
  include: { steps: true };
}>;

type WorkflowDefinitionStepRecord = WorkflowDefinitionRecord["steps"][number];

export type WorkflowDefinitionStepInput = {
  key: string;
  position: number;
  title: string;
  kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
  instructions?: string | null;
  toolName?: string | null;
  toolInputTemplateJson?: Prisma.InputJsonValue | null;
  expectedArtifactType?:
    | "POST"
    | "INTEGRATION_SET"
    | "ASSET"
    | "DOWNLOAD_JOB"
    | null;
};

export type WorkflowDefinitionInput = {
  title: string;
  description?: string | null;
  subjectType?: "POST" | "INTEGRATION_SET" | null;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  steps?: WorkflowDefinitionStepInput[];
};

export type WorkflowDefinitionSummaryView = {
  id: string;
  title: string;
  description: string | null;
  subjectType: "POST" | "INTEGRATION_SET" | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  stepCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowDefinitionStepView = {
  id: string;
  key: string;
  position: number;
  title: string;
  kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
  instructions: string | null;
  toolName: string | null;
  toolInputTemplateJson: Prisma.JsonValue | null;
  expectedArtifactType:
    | "POST"
    | "INTEGRATION_SET"
    | "ASSET"
    | "DOWNLOAD_JOB"
    | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowDefinitionView = {
  id: string;
  title: string;
  description: string | null;
  subjectType: "POST" | "INTEGRATION_SET" | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  steps: WorkflowDefinitionStepView[];
  createdAt: string;
  updatedAt: string;
};

export type WorkflowDefinitionWriteResult =
  | { ok: true; definition: WorkflowDefinitionView }
  | { ok: false; code: "VALIDATION_ERROR" | "NOT_FOUND"; message: string };

export type ArchiveWorkflowDefinitionResult =
  | { ok: true; definition: WorkflowDefinitionView }
  | { ok: false; code: "NOT_FOUND"; message: string };

type ValidatedWorkflowDefinitionInput = {
  title: string;
  description: string | null;
  subjectType: "POST" | "INTEGRATION_SET" | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  steps: Array<{
    key: string;
    position: number;
    title: string;
    kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
    instructions: string | null;
    toolName: string | null;
    toolInputTemplateJson: Prisma.InputJsonValue | null;
    expectedArtifactType:
      | "POST"
      | "INTEGRATION_SET"
      | "ASSET"
      | "DOWNLOAD_JOB"
      | null;
  }>;
};

function toWorkflowDefinitionSummaryView(
  definition: WorkflowDefinitionSummaryRecord
): WorkflowDefinitionSummaryView {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    subjectType: definition.subjectType,
    status: definition.status,
    stepCount: definition._count.steps,
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

function toWorkflowDefinitionStepView(
  step: WorkflowDefinitionStepRecord
): WorkflowDefinitionStepView {
  return {
    id: step.id,
    key: step.key,
    position: step.position,
    title: step.title,
    kind: step.kind,
    instructions: step.instructions,
    toolName: step.toolName,
    toolInputTemplateJson: step.toolInputTemplateJson,
    expectedArtifactType: step.expectedArtifactType,
    createdAt: step.createdAt.toISOString(),
    updatedAt: step.updatedAt.toISOString(),
  };
}

function toWorkflowDefinitionView(
  definition: WorkflowDefinitionRecord
): WorkflowDefinitionView {
  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    subjectType: definition.subjectType,
    status: definition.status,
    steps: definition.steps.map((step) => toWorkflowDefinitionStepView(step)),
    createdAt: definition.createdAt.toISOString(),
    updatedAt: definition.updatedAt.toISOString(),
  };
}

function normalizeNullableString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toNullableJsonInput(
  value: Prisma.InputJsonValue | null
): Prisma.InputJsonValue | typeof PrismaClient.JsonNull {
  return value === null ? PrismaClient.JsonNull : value;
}

function toWorkflowStepCreateData(
  step: ValidatedWorkflowDefinitionInput["steps"][number]
) {
  return {
    key: step.key,
    position: step.position,
    title: step.title,
    kind: step.kind,
    instructions: step.instructions,
    toolName: step.toolName,
    toolInputTemplateJson: toNullableJsonInput(step.toolInputTemplateJson),
    expectedArtifactType: step.expectedArtifactType,
  } satisfies Prisma.WorkflowStepDefinitionCreateWithoutDefinitionInput;
}

function validateWorkflowDefinitionInput(input: WorkflowDefinitionInput):
  | { ok: true; value: ValidatedWorkflowDefinitionInput }
  | {
      ok: false;
      message: string;
    } {
  const title = input.title.trim();
  if (!title) {
    return { ok: false, message: "Workflow definition title is required" };
  }

  const steps = (input.steps ?? [])
    .map((step) => ({
      ...step,
      key: step.key.trim(),
      title: step.title.trim(),
      instructions: normalizeNullableString(step.instructions),
      toolName: normalizeNullableString(step.toolName),
      toolInputTemplateJson: step.toolInputTemplateJson ?? null,
      expectedArtifactType: step.expectedArtifactType ?? null,
    }))
    .sort((a, b) => a.position - b.position);

  const seenKeys = new Set<string>();
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step) continue;

    if (!step.key) {
      return { ok: false, message: "Workflow step key is required" };
    }
    if (!WORKFLOW_STEP_KEY_PATTERN.test(step.key)) {
      return {
        ok: false,
        message:
          "Workflow step keys must use lowercase letters, numbers, and hyphens only",
      };
    }
    if (seenKeys.has(step.key)) {
      return {
        ok: false,
        message: `Workflow step key "${step.key}" must be unique within the definition`,
      };
    }
    seenKeys.add(step.key);

    if (!step.title) {
      return { ok: false, message: "Workflow step title is required" };
    }
    if (!Number.isInteger(step.position) || step.position !== index + 1) {
      return {
        ok: false,
        message: "Workflow step positions must be contiguous starting at 1",
      };
    }

    if (step.kind === "TOOL_CALL") {
      if (!step.toolName) {
        return {
          ok: false,
          message: `Workflow tool step "${step.key}" must define a tool name`,
        };
      }
      if (!VALID_TOOL_NAMES.has(step.toolName)) {
        return {
          ok: false,
          message: `Workflow tool step "${step.key}" references an unknown tool`,
        };
      }
    } else {
      if (step.toolName) {
        return {
          ok: false,
          message: `Workflow step "${step.key}" cannot define a tool name unless it is a TOOL_CALL step`,
        };
      }
      if (step.toolInputTemplateJson !== null) {
        return {
          ok: false,
          message: `Workflow step "${step.key}" cannot define tool input unless it is a TOOL_CALL step`,
        };
      }
    }
  }

  const status = input.status ?? "DRAFT";
  if (status === "ACTIVE" && steps.length === 0) {
    return {
      ok: false,
      message: "Active workflow definitions must contain at least one step",
    };
  }

  return {
    ok: true,
    value: {
      title,
      description: normalizeNullableString(input.description),
      subjectType: input.subjectType ?? null,
      status,
      steps,
    },
  };
}

export async function listWorkflowDefinitionsForOwner(
  userId: string
): Promise<WorkflowDefinitionSummaryView[]> {
  const prisma = await getPrisma();
  const definitions = await prisma.workflowDefinition.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: {
        select: { steps: true },
      },
    },
  });

  return definitions.map((definition) =>
    toWorkflowDefinitionSummaryView(definition)
  );
}

export async function getWorkflowDefinitionForOwner(
  userId: string,
  definitionId: string
): Promise<WorkflowDefinitionView | null> {
  const prisma = await getPrisma();
  const definition = await prisma.workflowDefinition.findUnique({
    where: { id: definitionId },
    include: {
      steps: {
        orderBy: [{ position: "asc" }],
      },
    },
  });

  if (!definition || definition.userId !== userId) return null;
  return toWorkflowDefinitionView(definition);
}

export async function createWorkflowDefinitionForOwner(
  userId: string,
  input: WorkflowDefinitionInput
): Promise<WorkflowDefinitionWriteResult> {
  const validated = validateWorkflowDefinitionInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: validated.message,
    };
  }

  const prisma = await getPrisma();
  const definition = await prisma.workflowDefinition.create({
    data: {
      userId,
      title: validated.value.title,
      description: validated.value.description,
      subjectType: validated.value.subjectType,
      status: validated.value.status,
      steps: {
        create: validated.value.steps.map((step) =>
          toWorkflowStepCreateData(step)
        ),
      },
    },
    include: {
      steps: {
        orderBy: [{ position: "asc" }],
      },
    },
  });

  return { ok: true, definition: toWorkflowDefinitionView(definition) };
}

export async function updateWorkflowDefinitionForOwner(
  userId: string,
  definitionId: string,
  input: WorkflowDefinitionInput
): Promise<WorkflowDefinitionWriteResult> {
  const validated = validateWorkflowDefinitionInput(input);
  if (!validated.ok) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: validated.message,
    };
  }

  const prisma = await getPrisma();
  const existing = await prisma.workflowDefinition.findUnique({
    where: { id: definitionId },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow definition not found or you do not own it",
    };
  }

  const definition = await prisma.workflowDefinition.update({
    where: { id: definitionId },
    data: {
      title: validated.value.title,
      description: validated.value.description,
      subjectType: validated.value.subjectType,
      status: validated.value.status,
      steps: {
        deleteMany: {},
        create: validated.value.steps.map((step) =>
          toWorkflowStepCreateData(step)
        ),
      },
    },
    include: {
      steps: {
        orderBy: [{ position: "asc" }],
      },
    },
  });

  return { ok: true, definition: toWorkflowDefinitionView(definition) };
}

export async function archiveWorkflowDefinitionForOwner(
  userId: string,
  definitionId: string
): Promise<ArchiveWorkflowDefinitionResult> {
  const prisma = await getPrisma();
  const existing = await prisma.workflowDefinition.findUnique({
    where: { id: definitionId },
    select: { id: true, userId: true },
  });
  if (!existing || existing.userId !== userId) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow definition not found or you do not own it",
    };
  }

  const definition = await prisma.workflowDefinition.update({
    where: { id: definitionId },
    data: {
      status: "ARCHIVED",
    },
    include: {
      steps: {
        orderBy: [{ position: "asc" }],
      },
    },
  });

  return { ok: true, definition: toWorkflowDefinitionView(definition) };
}
