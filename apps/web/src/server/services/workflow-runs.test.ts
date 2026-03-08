import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@lumigraph/db";
import {
  createWorkflowSessionForOwner,
  getWorkflowSessionForOwner,
  listRunArtifactRefsForOwner,
  listRunToolCallsForOwner,
  listWorkflowRunsForOwner,
  listWorkflowSessionsForOwner,
  recordFailedRunToolCallForOwner,
  recordRunArtifactRefForOwner,
  recordSuccessfulRunToolCallForOwner,
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
    asset: {
      findUnique: vi.fn(),
    },
    downloadJob: {
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
      findUnique: vi.fn(),
    },
    runToolCall: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    runArtifactRef: {
      findMany: vi.fn(),
      upsert: vi.fn(),
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

  it("records a successful tool call for an owned run", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      sessionId: "session-1",
    });
    prisma.runToolCall.create.mockResolvedValue({
      id: "call-1",
      runId: "run-1",
      toolName: "posts.get",
      status: "SUCCEEDED",
      inputJson: { postId: "post-1" },
      outputJson: { id: "post-1" },
      errorCode: null,
      errorMessage: null,
      errorJson: null,
      startedAt: new Date("2026-03-08T12:00:00.000Z"),
      completedAt: new Date("2026-03-08T12:00:01.000Z"),
      createdAt: new Date("2026-03-08T12:00:01.000Z"),
      updatedAt: new Date("2026-03-08T12:00:01.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await recordSuccessfulRunToolCallForOwner("user-1", {
      runId: "run-1",
      toolName: "posts.get",
      input: { postId: "post-1" },
      output: { id: "post-1" },
      startedAt: new Date("2026-03-08T12:00:00.000Z"),
      completedAt: new Date("2026-03-08T12:00:01.000Z"),
    });

    expect(prisma.runToolCall.create).toHaveBeenCalledWith({
      data: {
        runId: "run-1",
        userId: "user-1",
        toolName: "posts.get",
        status: "SUCCEEDED",
        inputJson: { postId: "post-1" },
        outputJson: { id: "post-1" },
        startedAt: new Date("2026-03-08T12:00:00.000Z"),
        completedAt: new Date("2026-03-08T12:00:01.000Z"),
      },
    });
    expect(result).toEqual({
      id: "call-1",
      runId: "run-1",
      toolName: "posts.get",
      status: "SUCCEEDED",
      input: { postId: "post-1" },
      output: { id: "post-1" },
      errorCode: null,
      errorMessage: null,
      errorDetails: null,
      startedAt: "2026-03-08T12:00:00.000Z",
      completedAt: "2026-03-08T12:00:01.000Z",
      createdAt: "2026-03-08T12:00:01.000Z",
      updatedAt: "2026-03-08T12:00:01.000Z",
    });
  });

  it("records a failed tool call for an owned run", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      sessionId: "session-1",
    });
    prisma.runToolCall.create.mockResolvedValue({
      id: "call-2",
      runId: "run-1",
      toolName: "export_jobs.create",
      status: "FAILED",
      inputJson: { integrationSetId: "set-1" },
      outputJson: null,
      errorCode: "BAD_REQUEST",
      errorMessage: "Invalid selection",
      errorJson: { invalidPaths: ["missing"] },
      startedAt: new Date("2026-03-08T12:02:00.000Z"),
      completedAt: new Date("2026-03-08T12:02:03.000Z"),
      createdAt: new Date("2026-03-08T12:02:03.000Z"),
      updatedAt: new Date("2026-03-08T12:02:03.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await recordFailedRunToolCallForOwner("user-1", {
      runId: "run-1",
      toolName: "export_jobs.create",
      input: { integrationSetId: "set-1" },
      errorCode: "BAD_REQUEST",
      errorMessage: "Invalid selection",
      errorDetails: { invalidPaths: ["missing"] },
      startedAt: new Date("2026-03-08T12:02:00.000Z"),
      completedAt: new Date("2026-03-08T12:02:03.000Z"),
    });

    expect(prisma.runToolCall.create).toHaveBeenCalledWith({
      data: {
        runId: "run-1",
        userId: "user-1",
        toolName: "export_jobs.create",
        status: "FAILED",
        inputJson: { integrationSetId: "set-1" },
        errorCode: "BAD_REQUEST",
        errorMessage: "Invalid selection",
        errorJson: { invalidPaths: ["missing"] },
        startedAt: new Date("2026-03-08T12:02:00.000Z"),
        completedAt: new Date("2026-03-08T12:02:03.000Z"),
      },
    });
    expect(result?.status).toBe("FAILED");
    expect(result?.errorDetails).toEqual({ invalidPaths: ["missing"] });
  });

  it("rejects tool-call recording for a run the user does not own", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
      userId: "other-user",
      sessionId: "session-1",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await recordSuccessfulRunToolCallForOwner("user-1", {
      runId: "run-1",
      toolName: "posts.get",
      input: { postId: "post-1" },
      output: { id: "post-1" },
    });

    expect(result).toBeNull();
    expect(prisma.runToolCall.create).not.toHaveBeenCalled();
  });

  it("lists run tool calls for one owner and optional run", async () => {
    const prisma = makePrismaMock();
    prisma.runToolCall.findMany.mockResolvedValue([
      {
        id: "call-1",
        runId: "run-1",
        toolName: "posts.get",
        status: "SUCCEEDED",
        inputJson: { postId: "post-1" },
        outputJson: { id: "post-1" },
        errorCode: null,
        errorMessage: null,
        errorJson: null,
        startedAt: new Date("2026-03-08T12:00:00.000Z"),
        completedAt: new Date("2026-03-08T12:00:01.000Z"),
        createdAt: new Date("2026-03-08T12:00:01.000Z"),
        updatedAt: new Date("2026-03-08T12:00:01.000Z"),
      },
    ]);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await listRunToolCallsForOwner("user-1", {
      runId: "run-1",
    });

    expect(prisma.runToolCall.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", runId: "run-1" },
      orderBy: [{ createdAt: "asc" }],
    });
    expect(result[0]?.toolName).toBe("posts.get");
  });

  it("records a run artifact ref for an owned asset and de-duplicates it", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      sessionId: "session-1",
    });
    prisma.asset.findUnique.mockResolvedValue({ userId: "user-1" });
    prisma.runArtifactRef.upsert.mockResolvedValue({
      id: "ref-1",
      runId: "run-1",
      artifactType: "ASSET",
      artifactId: "asset-1",
      createdAt: new Date("2026-03-08T12:03:00.000Z"),
      updatedAt: new Date("2026-03-08T12:03:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await recordRunArtifactRefForOwner("user-1", {
      runId: "run-1",
      artifact: { type: "ASSET", id: "asset-1" },
    });

    expect(prisma.runArtifactRef.upsert).toHaveBeenCalledWith({
      where: {
        runId_artifactType_artifactId: {
          runId: "run-1",
          artifactType: "ASSET",
          artifactId: "asset-1",
        },
      },
      update: {},
      create: {
        runId: "run-1",
        userId: "user-1",
        artifactType: "ASSET",
        artifactId: "asset-1",
      },
    });
    expect(result?.artifactType).toBe("ASSET");
    expect(result?.artifactId).toBe("asset-1");
  });

  it("rejects a run artifact ref when the underlying resource is not owned", async () => {
    const prisma = makePrismaMock();
    prisma.workflowRun.findUnique.mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      sessionId: "session-1",
    });
    prisma.downloadJob.findUnique.mockResolvedValue({ userId: "other-user" });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await recordRunArtifactRefForOwner("user-1", {
      runId: "run-1",
      artifact: { type: "DOWNLOAD_JOB", id: "job-1" },
    });

    expect(result).toBeNull();
    expect(prisma.runArtifactRef.upsert).not.toHaveBeenCalled();
  });

  it("lists run artifact refs for one owner and optional run", async () => {
    const prisma = makePrismaMock();
    prisma.runArtifactRef.findMany.mockResolvedValue([
      {
        id: "ref-1",
        runId: "run-1",
        artifactType: "POST",
        artifactId: "post-1",
        createdAt: new Date("2026-03-08T12:03:00.000Z"),
        updatedAt: new Date("2026-03-08T12:03:00.000Z"),
      },
    ]);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await listRunArtifactRefsForOwner("user-1", {
      runId: "run-1",
    });

    expect(prisma.runArtifactRef.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", runId: "run-1" },
      orderBy: [{ createdAt: "asc" }],
    });
    expect(result[0]?.artifactType).toBe("POST");
  });
});
