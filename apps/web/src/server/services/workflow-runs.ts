import { getPrisma, type Prisma } from "@lumigraph/db";

export type WorkflowSessionSubject =
  | { type: "POST"; id: string }
  | { type: "INTEGRATION_SET"; id: string };

export type WorkflowRunArtifact =
  | { type: "POST"; id: string }
  | { type: "INTEGRATION_SET"; id: string }
  | { type: "ASSET"; id: string }
  | { type: "DOWNLOAD_JOB"; id: string };

export type CreateWorkflowSessionInput = {
  workflowDefinitionId?: string | null;
  subject?: WorkflowSessionSubject | null;
  goal?: string | null;
};

export type StartWorkflowRunInput = {
  sessionId: string;
  trigger?: "MANUAL" | "RESUME" | "RETRY" | "SYSTEM";
  agentKind?: string;
  model?: string | null;
};

export type WorkflowSessionView = {
  id: string;
  workflowDefinitionId: string | null;
  subjectType: "POST" | "INTEGRATION_SET" | null;
  subjectId: string | null;
  goal: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunView = {
  id: string;
  sessionId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  trigger: "MANUAL" | "RESUME" | "RETRY" | "SYSTEM";
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

export type RestartWorkflowRunResult =
  | { ok: true; run: WorkflowRunView }
  | { ok: false; code: "NOT_FOUND" | "INVALID_STATE"; message: string };

export type WorkflowRunToolCallView = {
  id: string;
  runId: string;
  toolName: string;
  status: "SUCCEEDED" | "FAILED";
  input: Prisma.JsonValue;
  output: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorDetails: Prisma.JsonValue | null;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRunArtifactRefView = {
  id: string;
  runId: string;
  artifactType: "POST" | "INTEGRATION_SET" | "ASSET" | "DOWNLOAD_JOB";
  artifactId: string;
  createdAt: string;
  updatedAt: string;
};

export type RecordSuccessfulRunToolCallInput = {
  runId: string;
  toolName: string;
  input: Prisma.InputJsonValue;
  output: Prisma.InputJsonValue;
  startedAt?: Date;
  completedAt?: Date;
};

export type RecordFailedRunToolCallInput = {
  runId: string;
  toolName: string;
  input: Prisma.InputJsonValue;
  errorCode?: string | null;
  errorMessage: string;
  errorDetails?: Prisma.InputJsonValue;
  startedAt?: Date;
  completedAt?: Date;
};

export type RecordRunArtifactRefInput = {
  runId: string;
  artifact: WorkflowRunArtifact;
};

function toWorkflowSessionView(session: {
  id: string;
  workflowDefinitionId: string | null;
  subjectType: "POST" | "INTEGRATION_SET" | null;
  subjectId: string | null;
  goal: string | null;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}): WorkflowSessionView {
  return {
    id: session.id,
    workflowDefinitionId: session.workflowDefinitionId,
    subjectType: session.subjectType,
    subjectId: session.subjectId,
    goal: session.goal,
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toWorkflowRunView(run: {
  id: string;
  sessionId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  trigger: "MANUAL" | "RESUME" | "RETRY" | "SYSTEM";
  agentKind: string;
  model: string | null;
  summary: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowRunView {
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

function toWorkflowRunToolCallView(call: {
  id: string;
  runId: string;
  toolName: string;
  status: "SUCCEEDED" | "FAILED";
  inputJson: Prisma.JsonValue;
  outputJson: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  errorJson: Prisma.JsonValue | null;
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowRunToolCallView {
  return {
    id: call.id,
    runId: call.runId,
    toolName: call.toolName,
    status: call.status,
    input: call.inputJson,
    output: call.outputJson,
    errorCode: call.errorCode,
    errorMessage: call.errorMessage,
    errorDetails: call.errorJson,
    startedAt: call.startedAt.toISOString(),
    completedAt: call.completedAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

function toWorkflowRunArtifactRefView(ref: {
  id: string;
  runId: string;
  artifactType: "POST" | "INTEGRATION_SET" | "ASSET" | "DOWNLOAD_JOB";
  artifactId: string;
  createdAt: Date;
  updatedAt: Date;
}): WorkflowRunArtifactRefView {
  return {
    id: ref.id,
    runId: ref.runId,
    artifactType: ref.artifactType,
    artifactId: ref.artifactId,
    createdAt: ref.createdAt.toISOString(),
    updatedAt: ref.updatedAt.toISOString(),
  };
}

async function subjectIsOwnedByUser(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  userId: string,
  subject: WorkflowSessionSubject
) {
  if (subject.type === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: subject.id },
      select: { userId: true },
    });
    return post?.userId === userId;
  }

  const set = await prisma.integrationSet.findUnique({
    where: { id: subject.id },
    select: { userId: true },
  });
  return set?.userId === userId;
}

async function getOwnedRun(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  userId: string,
  runId: string
) {
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
    select: { id: true, userId: true, sessionId: true },
  });
  if (!run || run.userId !== userId) return null;
  return run;
}

async function artifactIsOwnedByUser(
  prisma: Prisma.TransactionClient | Prisma.DefaultPrismaClient,
  userId: string,
  artifact: WorkflowRunArtifact
) {
  if (artifact.type === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: artifact.id },
      select: { userId: true },
    });
    return post?.userId === userId;
  }

  if (artifact.type === "INTEGRATION_SET") {
    const set = await prisma.integrationSet.findUnique({
      where: { id: artifact.id },
      select: { userId: true },
    });
    return set?.userId === userId;
  }

  if (artifact.type === "ASSET") {
    const asset = await prisma.asset.findUnique({
      where: { id: artifact.id },
      select: { userId: true },
    });
    return asset?.userId === userId;
  }

  const job = await prisma.downloadJob.findUnique({
    where: { id: artifact.id },
    select: { userId: true },
  });
  return job?.userId === userId;
}

export async function createWorkflowSessionForOwner(
  userId: string,
  input: CreateWorkflowSessionInput
): Promise<WorkflowSessionView | null> {
  const prisma = await getPrisma();

  if (input.subject) {
    const isOwned = await subjectIsOwnedByUser(prisma, userId, input.subject);
    if (!isOwned) return null;
  }

  const session = await prisma.workflowSession.create({
    data: {
      userId,
      workflowDefinitionId: input.workflowDefinitionId ?? null,
      subjectType: input.subject?.type ?? null,
      subjectId: input.subject?.id ?? null,
      goal: input.goal ?? null,
    },
  });

  return toWorkflowSessionView(session);
}

export async function getWorkflowSessionForOwner(
  userId: string,
  sessionId: string
): Promise<WorkflowSessionView | null> {
  const prisma = await getPrisma();
  const session = await prisma.workflowSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== userId) return null;
  return toWorkflowSessionView(session);
}

export async function getWorkflowRunForOwner(
  userId: string,
  runId: string
): Promise<WorkflowRunView | null> {
  const prisma = await getPrisma();
  const run = await prisma.workflowRun.findUnique({
    where: { id: runId },
  });
  if (!run || run.userId !== userId) return null;
  return toWorkflowRunView(run);
}

export async function listWorkflowSessionsForOwner(
  userId: string
): Promise<WorkflowSessionView[]> {
  const prisma = await getPrisma();
  const sessions = await prisma.workflowSession.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
  });
  return sessions.map((session) => toWorkflowSessionView(session));
}

export async function startWorkflowRunForOwner(
  userId: string,
  input: StartWorkflowRunInput
): Promise<WorkflowRunView | null> {
  const prisma = await getPrisma();
  const session = await prisma.workflowSession.findUnique({
    where: { id: input.sessionId },
    select: { id: true, userId: true, status: true },
  });
  if (!session || session.userId !== userId || session.status !== "ACTIVE") {
    return null;
  }

  const now = new Date();
  const run = await prisma.$transaction(async (tx) => {
    const createdRun = await tx.workflowRun.create({
      data: {
        sessionId: session.id,
        userId,
        status: "RUNNING",
        trigger: input.trigger ?? "MANUAL",
        agentKind: input.agentKind?.trim() || "default",
        model: input.model ?? null,
        startedAt: now,
      },
    });

    await tx.workflowSession.update({
      where: { id: session.id },
      data: { updatedAt: now },
    });

    return createdRun;
  });

  return toWorkflowRunView(run);
}

async function restartWorkflowRunForOwner(
  userId: string,
  sourceRunId: string,
  trigger: "RESUME" | "RETRY"
): Promise<RestartWorkflowRunResult> {
  const prisma = await getPrisma();
  const sourceRun = await prisma.workflowRun.findUnique({
    where: { id: sourceRunId },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      status: true,
      agentKind: true,
      model: true,
      session: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!sourceRun || sourceRun.userId !== userId) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow run not found or you do not own it",
    };
  }

  if (sourceRun.session.status !== "ACTIVE") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "Workflow session is archived and cannot start a new run",
    };
  }

  const allowedStatuses =
    trigger === "RESUME" ? ["PENDING", "FAILED"] : ["FAILED", "CANCELLED"];
  if (!allowedStatuses.includes(sourceRun.status)) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message:
        trigger === "RESUME"
          ? "Only pending or failed runs can be resumed"
          : "Only failed or cancelled runs can be retried",
    };
  }

  const run = await startWorkflowRunForOwner(userId, {
    sessionId: sourceRun.sessionId,
    trigger,
    agentKind: sourceRun.agentKind,
    model: sourceRun.model,
  });

  if (!run) {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: "Workflow session is no longer active",
    };
  }

  return { ok: true, run };
}

export async function resumeWorkflowRunForOwner(
  userId: string,
  sourceRunId: string
): Promise<RestartWorkflowRunResult> {
  return restartWorkflowRunForOwner(userId, sourceRunId, "RESUME");
}

export async function retryWorkflowRunForOwner(
  userId: string,
  sourceRunId: string
): Promise<RestartWorkflowRunResult> {
  return restartWorkflowRunForOwner(userId, sourceRunId, "RETRY");
}

export async function listWorkflowRunsForOwner(
  userId: string,
  options?: { sessionId?: string }
): Promise<WorkflowRunView[]> {
  const prisma = await getPrisma();
  const runs = await prisma.workflowRun.findMany({
    where: {
      userId,
      ...(options?.sessionId && { sessionId: options.sessionId }),
    },
    orderBy: [{ createdAt: "desc" }],
  });
  return runs.map((run) => toWorkflowRunView(run));
}

export async function recordSuccessfulRunToolCallForOwner(
  userId: string,
  input: RecordSuccessfulRunToolCallInput
): Promise<WorkflowRunToolCallView | null> {
  const prisma = await getPrisma();
  const run = await getOwnedRun(prisma, userId, input.runId);
  if (!run) return null;

  const completedAt = input.completedAt ?? new Date();
  const startedAt = input.startedAt ?? completedAt;
  const call = await prisma.runToolCall.create({
    data: {
      runId: run.id,
      userId,
      toolName: input.toolName,
      status: "SUCCEEDED",
      inputJson: input.input,
      outputJson: input.output,
      startedAt,
      completedAt,
    },
  });

  return toWorkflowRunToolCallView(call);
}

export async function recordFailedRunToolCallForOwner(
  userId: string,
  input: RecordFailedRunToolCallInput
): Promise<WorkflowRunToolCallView | null> {
  const prisma = await getPrisma();
  const run = await getOwnedRun(prisma, userId, input.runId);
  if (!run) return null;

  const completedAt = input.completedAt ?? new Date();
  const startedAt = input.startedAt ?? completedAt;
  const call = await prisma.runToolCall.create({
    data: {
      runId: run.id,
      userId,
      toolName: input.toolName,
      status: "FAILED",
      inputJson: input.input,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage,
      ...(input.errorDetails !== undefined && {
        errorJson: input.errorDetails,
      }),
      startedAt,
      completedAt,
    },
  });

  return toWorkflowRunToolCallView(call);
}

export async function listRunToolCallsForOwner(
  userId: string,
  options?: { runId?: string }
): Promise<WorkflowRunToolCallView[]> {
  const prisma = await getPrisma();
  const calls = await prisma.runToolCall.findMany({
    where: {
      userId,
      ...(options?.runId && { runId: options.runId }),
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return calls.map((call) => toWorkflowRunToolCallView(call));
}

export async function recordRunArtifactRefForOwner(
  userId: string,
  input: RecordRunArtifactRefInput
): Promise<WorkflowRunArtifactRefView | null> {
  const prisma = await getPrisma();
  const run = await getOwnedRun(prisma, userId, input.runId);
  if (!run) return null;

  const isOwned = await artifactIsOwnedByUser(prisma, userId, input.artifact);
  if (!isOwned) return null;

  const ref = await prisma.runArtifactRef.upsert({
    where: {
      runId_artifactType_artifactId: {
        runId: run.id,
        artifactType: input.artifact.type,
        artifactId: input.artifact.id,
      },
    },
    update: {},
    create: {
      runId: run.id,
      userId,
      artifactType: input.artifact.type,
      artifactId: input.artifact.id,
    },
  });

  return toWorkflowRunArtifactRefView(ref);
}

export async function listRunArtifactRefsForOwner(
  userId: string,
  options?: { runId?: string }
): Promise<WorkflowRunArtifactRefView[]> {
  const prisma = await getPrisma();
  const refs = await prisma.runArtifactRef.findMany({
    where: {
      userId,
      ...(options?.runId && { runId: options.runId }),
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return refs.map((ref) => toWorkflowRunArtifactRefView(ref));
}
