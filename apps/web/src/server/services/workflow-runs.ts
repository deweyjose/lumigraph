import { getPrisma, type Prisma } from "@lumigraph/db";

export type WorkflowSessionSubject =
  | { type: "POST"; id: string }
  | { type: "INTEGRATION_SET"; id: string };

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
