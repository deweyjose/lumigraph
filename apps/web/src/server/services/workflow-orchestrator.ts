import { randomUUID } from "node:crypto";
import { getPrisma, type Prisma } from "@lumigraph/db";
import {
  executeLumigraphTool,
  type LumigraphToolName,
} from "../tools/lumigraph";

const RUN_EVENT_ACTOR_SYSTEM = "SYSTEM";

type WorkflowRunStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING_FOR_INPUT"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

type WorkflowRunTrigger = "MANUAL" | "RESUME" | "RETRY" | "SYSTEM";

type WorkflowRunRecord = {
  id: string;
  sessionId: string;
  userId: string;
  status: WorkflowRunStatus;
  trigger: WorkflowRunTrigger;
  agentKind: string;
  model: string | null;
  summary: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowRunView = {
  id: string;
  sessionId: string;
  status: WorkflowRunStatus;
  trigger: WorkflowRunTrigger;
  agentKind: string;
  model: string | null;
  summary: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunEventView = {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  actor: string;
  stepKey: string | null;
  payload: Prisma.JsonValue;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExecuteWorkflowRunResult =
  | { ok: true; run: WorkflowRunView }
  | {
      ok: false;
      code: "NOT_FOUND" | "INVALID_STATE";
      message: string;
    };

type ExecutionContext = {
  userId: string;
  runId: string;
  sessionId: string;
  goal: string | null;
  subject: { type: "POST" | "INTEGRATION_SET"; id: string } | null;
};

function toWorkflowRunView(run: WorkflowRunRecord): WorkflowRunView {
  return {
    id: run.id,
    sessionId: run.sessionId,
    status: run.status,
    trigger: run.trigger,
    agentKind: run.agentKind,
    model: run.model,
    summary: run.summary,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
    cancelledAt: run.cancelledAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function toWorkflowRunEventView(event: {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  actor: string;
  stepKey: string | null;
  payloadJson: Prisma.JsonValue;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowRunEventView {
  return {
    id: event.id,
    runId: event.runId,
    sequence: event.sequence,
    type: event.type,
    actor: event.actor,
    stepKey: event.stepKey,
    payload: event.payloadJson,
    occurredAt: event.occurredAt.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}

function findTemplatePathValue(
  source: Record<string, unknown>,
  path: string
): unknown {
  const keys = path.split(".");
  let current: unknown = source;

  for (const key of keys) {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

const EXACT_TEMPLATE_PATTERN = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;
const INTERPOLATION_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function resolveToolInputTemplate(
  value: unknown,
  context: Record<string, unknown>
): unknown {
  if (typeof value === "string") {
    const exact = value.match(EXACT_TEMPLATE_PATTERN);
    if (exact && exact[1]) {
      const resolved = findTemplatePathValue(context, exact[1]);
      return resolved === undefined ? null : resolved;
    }

    return value.replace(INTERPOLATION_PATTERN, (_match, path: string) => {
      const resolved = findTemplatePathValue(context, path);
      return resolved === undefined || resolved === null
        ? ""
        : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => resolveToolInputTemplate(entry, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        resolveToolInputTemplate(entry, context),
      ])
    );
  }

  return value;
}

function asJsonObject(value: unknown): Prisma.InputJsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Prisma.InputJsonObject;
  }
  return {};
}

function asInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asJsonValue(value: unknown): Prisma.JsonValue {
  return value as Prisma.JsonValue;
}

function extractArtifactIdFromToolOutput(
  expectedType: "POST" | "INTEGRATION_SET" | "ASSET" | "DOWNLOAD_JOB" | null,
  output: Prisma.JsonValue
): string | null {
  if (!expectedType || !output || typeof output !== "object") return null;

  const candidate = output as Record<string, unknown>;
  if (typeof candidate.id === "string") return candidate.id;

  if (expectedType === "POST" && typeof candidate.postId === "string") {
    return candidate.postId;
  }

  if (
    expectedType === "INTEGRATION_SET" &&
    typeof candidate.integrationSetId === "string"
  ) {
    return candidate.integrationSetId;
  }

  if (expectedType === "ASSET" && typeof candidate.assetId === "string") {
    return candidate.assetId;
  }

  if (expectedType === "DOWNLOAD_JOB") {
    if (typeof candidate.jobId === "string") return candidate.jobId;
    if (candidate.job && typeof candidate.job === "object") {
      const nested = candidate.job as Record<string, unknown>;
      if (typeof nested.id === "string") return nested.id;
    }
  }

  return null;
}

async function appendRunEvent(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: {
    runId: string;
    userId: string;
    type: string;
    payload: Prisma.InputJsonObject;
    actor?: string;
    stepKey?: string | null;
    occurredAt?: Date;
  }
) {
  const latest = await prisma.runEvent.findFirst({
    where: { runId: input.runId },
    select: { sequence: true },
    orderBy: [{ sequence: "desc" }],
  });

  return prisma.runEvent.create({
    data: {
      runId: input.runId,
      userId: input.userId,
      sequence: (latest?.sequence ?? 0) + 1,
      type: input.type,
      actor: input.actor ?? RUN_EVENT_ACTOR_SYSTEM,
      stepKey: input.stepKey ?? null,
      payloadJson: input.payload,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

async function getRunForExecution(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  userId: string,
  runId: string
) {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    include: {
      session: {
        include: {
          workflowDefinition: {
            include: {
              steps: {
                orderBy: [{ position: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!run || run.userId !== userId) return null;
  return run;
}

async function failRun(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: {
    runId: string;
    userId: string;
    message: string;
    code?: string;
    stepKey?: string | null;
  }
): Promise<WorkflowRunView> {
  const now = new Date();
  const updated = await prisma.workflowRun.update({
    where: { id: input.runId },
    data: {
      status: "FAILED",
      errorMessage: input.message,
      completedAt: now,
      summary: null,
    },
  });

  await appendRunEvent(prisma, {
    runId: input.runId,
    userId: input.userId,
    type: "run.failed",
    stepKey: input.stepKey ?? null,
    payload: {
      ...(input.code ? { errorCode: input.code } : {}),
      message: input.message,
    },
    occurredAt: now,
  });

  return toWorkflowRunView(updated);
}

async function markRunWaitingForInput(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: {
    runId: string;
    userId: string;
    stepKey: string;
    prompt: string;
  }
): Promise<WorkflowRunView> {
  const requestId = randomUUID();
  const now = new Date();

  await appendRunEvent(prisma, {
    runId: input.runId,
    userId: input.userId,
    type: "operator.input_requested",
    stepKey: input.stepKey,
    payload: {
      requestId,
      prompt: input.prompt,
      inputSchemaJson: {
        type: "object",
        properties: {
          approved: {
            type: "boolean",
          },
          note: {
            type: "string",
          },
        },
        required: ["approved"],
      },
    },
    occurredAt: now,
  });

  await appendRunEvent(prisma, {
    runId: input.runId,
    userId: input.userId,
    type: "run.waiting_for_input",
    stepKey: input.stepKey,
    payload: {
      requestId,
      prompt: input.prompt,
      inputSchemaJson: {
        type: "object",
        properties: {
          approved: {
            type: "boolean",
          },
          note: {
            type: "string",
          },
        },
        required: ["approved"],
      },
    },
    occurredAt: now,
  });

  const updated = await prisma.workflowRun.update({
    where: { id: input.runId },
    data: {
      status: "WAITING_FOR_INPUT",
      summary: `Awaiting review input for step "${input.stepKey}"`,
      errorMessage: null,
    },
  });

  return toWorkflowRunView(updated);
}

async function findResumeStartIndex(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: {
    sourceRunId?: string;
    steps: Array<{ key: string }>;
  }
): Promise<number> {
  if (!input.sourceRunId) return 0;

  const sourceRun = await prisma.workflowRun.findUnique({
    where: { id: input.sourceRunId },
    select: { status: true },
  });

  if (!sourceRun || sourceRun.status !== "WAITING_FOR_INPUT") {
    return 0;
  }

  const waitingEvent = await prisma.runEvent.findFirst({
    where: {
      runId: input.sourceRunId,
      type: "run.waiting_for_input",
    },
    orderBy: [{ sequence: "desc" }],
    select: { stepKey: true },
  });

  if (!waitingEvent?.stepKey) return 0;

  const index = input.steps.findIndex(
    (step) => step.key === waitingEvent.stepKey
  );
  return index >= 0 ? index + 1 : 0;
}

async function executeToolStep(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: {
    runId: string;
    userId: string;
    step: {
      key: string;
      title: string;
      position: number;
      toolName: string | null;
      toolInputTemplateJson: Prisma.JsonValue | null;
      expectedArtifactType:
        | "POST"
        | "INTEGRATION_SET"
        | "ASSET"
        | "DOWNLOAD_JOB"
        | null;
    };
    context: ExecutionContext;
  }
): Promise<{ ok: true } | { ok: false; run: WorkflowRunView }> {
  if (!input.step.toolName) {
    return {
      ok: false,
      run: await failRun(prisma, {
        runId: input.runId,
        userId: input.userId,
        code: "VALIDATION_ERROR",
        message: `Workflow step "${input.step.key}" is missing toolName`,
        stepKey: input.step.key,
      }),
    };
  }

  const callId = randomUUID();
  const resolvedInput = asJsonObject(
    resolveToolInputTemplate(input.step.toolInputTemplateJson, {
      run: {
        id: input.context.runId,
      },
      session: {
        id: input.context.sessionId,
        goal: input.context.goal,
      },
      subject: input.context.subject,
      goal: input.context.goal,
    })
  );

  await appendRunEvent(prisma, {
    runId: input.runId,
    userId: input.userId,
    type: "tool_call.requested",
    stepKey: input.step.key,
    payload: {
      callId,
      toolName: input.step.toolName,
      inputJson: resolvedInput,
    },
  });

  const startedAt = new Date();
  const outcome = await executeLumigraphTool(
    input.step.toolName as LumigraphToolName,
    { userId: input.userId },
    resolvedInput
  );
  const completedAt = new Date();
  const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime());

  if (!outcome.ok) {
    await prisma.runToolCall.create({
      data: {
        runId: input.runId,
        userId: input.userId,
        toolName: input.step.toolName,
        status: "FAILED",
        inputJson: resolvedInput,
        errorCode: outcome.code,
        errorMessage: outcome.message,
        startedAt,
        completedAt,
      },
    });

    await appendRunEvent(prisma, {
      runId: input.runId,
      userId: input.userId,
      type: "tool_call.failed",
      stepKey: input.step.key,
      payload: {
        callId,
        toolName: input.step.toolName,
        errorCode: outcome.code,
        errorMessage: outcome.message,
        durationMs,
      },
      occurredAt: completedAt,
    });

    await appendRunEvent(prisma, {
      runId: input.runId,
      userId: input.userId,
      type: "step.failed",
      stepKey: input.step.key,
      payload: {
        stepKey: input.step.key,
        position: input.step.position,
        message: outcome.message,
        errorCode: outcome.code,
      },
      occurredAt: completedAt,
    });

    return {
      ok: false,
      run: await failRun(prisma, {
        runId: input.runId,
        userId: input.userId,
        code: outcome.code,
        message: outcome.message,
        stepKey: input.step.key,
      }),
    };
  }

  await prisma.runToolCall.create({
    data: {
      runId: input.runId,
      userId: input.userId,
      toolName: input.step.toolName,
      status: "SUCCEEDED",
      inputJson: resolvedInput,
      outputJson: asInputJsonValue(outcome.data),
      startedAt,
      completedAt,
    },
  });

  await appendRunEvent(prisma, {
    runId: input.runId,
    userId: input.userId,
    type: "tool_call.succeeded",
    stepKey: input.step.key,
    payload: {
      callId,
      toolName: input.step.toolName,
      outputJson: asInputJsonValue(outcome.data),
      durationMs,
    },
    occurredAt: completedAt,
  });

  const artifactId = extractArtifactIdFromToolOutput(
    input.step.expectedArtifactType,
    asJsonValue(outcome.data)
  );
  if (input.step.expectedArtifactType && artifactId) {
    await prisma.runArtifactRef.upsert({
      where: {
        runId_artifactType_artifactId: {
          runId: input.runId,
          artifactType: input.step.expectedArtifactType,
          artifactId,
        },
      },
      update: {},
      create: {
        runId: input.runId,
        userId: input.userId,
        artifactType: input.step.expectedArtifactType,
        artifactId,
      },
    });
  }

  return { ok: true };
}

export async function listRunEventsForOwner(
  userId: string,
  options?: { runId?: string }
): Promise<WorkflowRunEventView[]> {
  const prisma = await getPrisma();
  const events = await prisma.runEvent.findMany({
    where: {
      userId,
      ...(options?.runId && { runId: options.runId }),
    },
    orderBy: [{ sequence: "asc" }],
  });

  return events.map((event) => toWorkflowRunEventView(event));
}

export async function executeWorkflowRunForOwner(
  userId: string,
  runId: string,
  options?: { sourceRunId?: string }
): Promise<ExecuteWorkflowRunResult> {
  const prisma = await getPrisma();
  const run = await getRunForExecution(prisma, userId, runId);

  if (!run) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow run not found or you do not own it",
    };
  }

  if (run.status === "CANCELLED" || run.status === "SUCCEEDED") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "Workflow run is already terminal and cannot execute",
    };
  }

  const definition = run.session.workflowDefinition;
  if (!definition || definition.userId !== userId) {
    return {
      ok: true,
      run: await failRun(prisma, {
        runId,
        userId,
        code: "NOT_FOUND",
        message: "Workflow definition is missing or not owned",
      }),
    };
  }

  const now = new Date();
  const startedRun = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "RUNNING",
      startedAt: run.startedAt ?? now,
      completedAt: null,
      cancelledAt: null,
      errorMessage: null,
    },
  });

  await appendRunEvent(prisma, {
    runId,
    userId,
    type: "run.started",
    payload: {
      trigger: run.trigger,
      agentKind: run.agentKind,
      model: run.model,
    },
    occurredAt: startedRun.startedAt ?? now,
  });

  if (run.trigger === "RESUME") {
    await appendRunEvent(prisma, {
      runId,
      userId,
      type: "run.resumed",
      payload: {
        reason: "MANUAL_RESUME",
      },
    });
  }

  const executionContext: ExecutionContext = {
    userId,
    runId,
    sessionId: run.sessionId,
    goal: run.session.goal,
    subject:
      run.session.subjectType && run.session.subjectId
        ? {
            type: run.session.subjectType,
            id: run.session.subjectId,
          }
        : null,
  };

  const steps = definition.steps;
  const startIndex = await findResumeStartIndex(prisma, {
    sourceRunId: options?.sourceRunId,
    steps,
  });

  for (let index = startIndex; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step) continue;

    await appendRunEvent(prisma, {
      runId,
      userId,
      type: "step.started",
      stepKey: step.key,
      payload: {
        stepKey: step.key,
        position: step.position,
        kind: step.kind,
        title: step.title,
      },
    });

    if (step.kind === "INSTRUCTION") {
      if (step.instructions) {
        await appendRunEvent(prisma, {
          runId,
          userId,
          type: "run.message",
          stepKey: step.key,
          payload: {
            level: "INFO",
            text: step.instructions,
          },
        });
      }

      await appendRunEvent(prisma, {
        runId,
        userId,
        type: "step.completed",
        stepKey: step.key,
        payload: {
          stepKey: step.key,
          position: step.position,
        },
      });
      continue;
    }

    if (step.kind === "REVIEW") {
      const waitingRun = await markRunWaitingForInput(prisma, {
        runId,
        userId,
        stepKey: step.key,
        prompt:
          step.instructions ??
          `Review step "${step.title}" and resume when ready.`,
      });
      return { ok: true, run: waitingRun };
    }

    const stepResult = await executeToolStep(prisma, {
      runId,
      userId,
      step: {
        key: step.key,
        title: step.title,
        position: step.position,
        toolName: step.toolName,
        toolInputTemplateJson: step.toolInputTemplateJson,
        expectedArtifactType: step.expectedArtifactType,
      },
      context: executionContext,
    });

    if (!stepResult.ok) {
      return {
        ok: true,
        run: stepResult.run,
      };
    }

    await appendRunEvent(prisma, {
      runId,
      userId,
      type: "step.completed",
      stepKey: step.key,
      payload: {
        stepKey: step.key,
        position: step.position,
      },
    });
  }

  const completedAt = new Date();
  const succeeded = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status: "SUCCEEDED",
      summary: `Executed ${Math.max(steps.length - startIndex, 0)} step(s)`,
      completedAt,
      errorMessage: null,
    },
  });

  await appendRunEvent(prisma, {
    runId,
    userId,
    type: "run.succeeded",
    payload: {
      summary: succeeded.summary,
    },
    occurredAt: completedAt,
  });

  return {
    ok: true,
    run: toWorkflowRunView(succeeded),
  };
}
