import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@lumigraph/db";
import {
  createWorkflowSessionForOwner,
  getWorkflowSessionForOwner,
  listWorkflowRunsForOwner,
  listWorkflowSessionsForOwner,
  startWorkflowRunForOwner,
} from "./workflow-runs";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

function makePrismaMock() {
  const prisma = {
    $transaction: vi.fn(),
    post: {
      findUnique: vi.fn(),
    },
    integrationSet: {
      findUnique: vi.fn(),
    },
    workflowSession: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workflowRun: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };

  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

  return prisma;
}

describe("workflow-runs service", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("creates a workflow session for an owned post subject", async () => {
    const prisma = makePrismaMock();
    prisma.post.findUnique.mockResolvedValue({ userId: "user-1" });
    prisma.workflowSession.create.mockResolvedValue({
      id: "session-1",
      workflowDefinitionId: null,
      subjectType: "POST",
      subjectId: "post-1",
      goal: "Draft a publish plan",
      status: "ACTIVE",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowSessionForOwner("user-1", {
      subject: { type: "POST", id: "post-1" },
      goal: "Draft a publish plan",
    });

    expect(prisma.workflowSession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        workflowDefinitionId: null,
        subjectType: "POST",
        subjectId: "post-1",
        goal: "Draft a publish plan",
      },
    });
    expect(result).toEqual({
      id: "session-1",
      workflowDefinitionId: null,
      subjectType: "POST",
      subjectId: "post-1",
      goal: "Draft a publish plan",
      status: "ACTIVE",
      createdAt: "2026-03-08T12:00:00.000Z",
      updatedAt: "2026-03-08T12:00:00.000Z",
    });
  });

  it("rejects workflow session creation when the subject is not owned", async () => {
    const prisma = makePrismaMock();
    prisma.integrationSet.findUnique.mockResolvedValue({
      userId: "other-user",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowSessionForOwner("user-1", {
      subject: { type: "INTEGRATION_SET", id: "set-1" },
    });

    expect(result).toBeNull();
    expect(prisma.workflowSession.create).not.toHaveBeenCalled();
  });

  it("lists owned workflow sessions newest first", async () => {
    const prisma = makePrismaMock();
    prisma.workflowSession.findMany.mockResolvedValue([
      {
        id: "session-1",
        workflowDefinitionId: null,
        subjectType: null,
        subjectId: null,
        goal: null,
        status: "ACTIVE",
        createdAt: new Date("2026-03-08T12:00:00.000Z"),
        updatedAt: new Date("2026-03-08T12:30:00.000Z"),
      },
    ]);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await listWorkflowSessionsForOwner("user-1");

    expect(prisma.workflowSession.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ updatedAt: "desc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("session-1");
  });

  it("returns null when a workflow session is missing or not owned", async () => {
    const prisma = makePrismaMock();
    prisma.workflowSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "other-user",
      workflowDefinitionId: null,
      subjectType: null,
      subjectId: null,
      goal: null,
      status: "ACTIVE",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:30:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await getWorkflowSessionForOwner("user-1", "session-1");

    expect(result).toBeNull();
  });

  it("starts a workflow run for an active owned session", async () => {
    const prisma = makePrismaMock();
    prisma.workflowSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      status: "ACTIVE",
    });
    prisma.workflowRun.create.mockResolvedValue({
      id: "run-1",
      sessionId: "session-1",
      status: "RUNNING",
      trigger: "MANUAL",
      agentKind: "planner",
      model: "gpt-4o-mini",
      summary: null,
      errorMessage: null,
      startedAt: new Date("2026-03-08T12:00:00.000Z"),
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await startWorkflowRunForOwner("user-1", {
      sessionId: "session-1",
      agentKind: "planner",
      model: "gpt-4o-mini",
    });

    expect(prisma.workflowRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "session-1",
        userId: "user-1",
        status: "RUNNING",
        trigger: "MANUAL",
        agentKind: "planner",
        model: "gpt-4o-mini",
      }),
    });
    expect(prisma.workflowSession.update).toHaveBeenCalledWith({
      where: { id: "session-1" },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(result?.status).toBe("RUNNING");
  });

  it("does not start a run for an archived or unowned session", async () => {
    const prisma = makePrismaMock();
    prisma.workflowSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      status: "ARCHIVED",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await startWorkflowRunForOwner("user-1", {
      sessionId: "session-1",
    });

    expect(result).toBeNull();
    expect(prisma.workflowRun.create).not.toHaveBeenCalled();
  });

  it("lists workflow runs for one owner and optional session", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findMany.mockResolvedValue([
      {
        id: "run-1",
        sessionId: "session-1",
        status: "RUNNING",
        trigger: "MANUAL",
        agentKind: "default",
        model: null,
        summary: null,
        errorMessage: null,
        startedAt: new Date("2026-03-08T12:00:00.000Z"),
        completedAt: null,
        cancelledAt: null,
        createdAt: new Date("2026-03-08T12:00:00.000Z"),
        updatedAt: new Date("2026-03-08T12:00:00.000Z"),
      },
    ]);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await listWorkflowRunsForOwner("user-1", {
      sessionId: "session-1",
    });

    expect(prisma.workflowRun.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", sessionId: "session-1" },
      orderBy: [{ createdAt: "desc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("run-1");
  });
});
