/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPrisma } from "@lumigraph/db";
import { executeLumigraphTool } from "../tools/lumigraph";
import {
  executeWorkflowRunForOwner,
  listRunEventsForOwner,
} from "./workflow-orchestrator";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("../tools/lumigraph", () => ({
  executeLumigraphTool: vi.fn(),
}));

type Step = {
  id: string;
  key: string;
  position: number;
  title: string;
  kind: "INSTRUCTION" | "TOOL_CALL" | "REVIEW";
  instructions: string | null;
  toolName: string | null;
  toolInputTemplateJson: Record<string, unknown> | null;
  expectedArtifactType:
    | "POST"
    | "INTEGRATION_SET"
    | "ASSET"
    | "DOWNLOAD_JOB"
    | null;
};

function makeRun(overrides?: {
  id?: string;
  userId?: string;
  status?:
    | "PENDING"
    | "RUNNING"
    | "WAITING_FOR_INPUT"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  trigger?: "MANUAL" | "RESUME" | "RETRY" | "SYSTEM";
  steps?: Step[];
}) {
  return {
    id: overrides?.id ?? "run-1",
    sessionId: "session-1",
    userId: overrides?.userId ?? "user-1",
    status: overrides?.status ?? "RUNNING",
    trigger: overrides?.trigger ?? "MANUAL",
    agentKind: "workflow-definition",
    model: null,
    summary: null,
    errorMessage: null,
    startedAt: new Date("2026-03-09T10:00:00.000Z"),
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-03-09T10:00:00.000Z"),
    updatedAt: new Date("2026-03-09T10:00:00.000Z"),
    session: {
      id: "session-1",
      goal: "Run workflow",
      subjectType: "POST",
      subjectId: "post-1",
      workflowDefinition: {
        id: "definition-1",
        userId: "user-1",
        steps: overrides?.steps ?? [
          {
            id: "step-1",
            key: "review-assets",
            position: 1,
            title: "Review assets",
            kind: "INSTRUCTION",
            instructions: "Check inputs before publish.",
            toolName: null,
            toolInputTemplateJson: null,
            expectedArtifactType: null,
          },
        ],
      },
    },
  };
}

function makePrismaMock(input: {
  run: ReturnType<typeof makeRun>;
  sourceRunStatusById?: Record<
    string,
    "WAITING_FOR_INPUT" | "FAILED" | "PENDING"
  >;
  seedEvents?: Array<{
    id: string;
    runId: string;
    userId: string;
    sequence: number;
    type: string;
    actor: string;
    stepKey: string | null;
    payloadJson: Record<string, unknown>;
    occurredAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  const runStore = new Map<string, any>();
  runStore.set(input.run.id, { ...input.run });

  for (const [sourceRunId, status] of Object.entries(
    input.sourceRunStatusById ?? {}
  )) {
    runStore.set(sourceRunId, { id: sourceRunId, status });
  }

  const events = [...(input.seedEvents ?? [])];

  const prisma = {
    workflowRun: {
      findUnique: vi.fn(async (args: any) => {
        const run = runStore.get(args.where.id);
        if (!run) return null;

        if (args.include) {
          return { ...run };
        }

        if (args.select?.status) {
          return { status: run.status };
        }

        return { ...run };
      }),
      update: vi.fn(async (args: any) => {
        const current = runStore.get(args.where.id);
        if (!current) throw new Error("Missing run");

        const updated = {
          ...current,
          ...args.data,
          updatedAt: new Date("2026-03-09T10:00:10.000Z"),
        };
        runStore.set(args.where.id, updated);
        return updated;
      }),
    },
    runEvent: {
      findFirst: vi.fn(async (args: any) => {
        const runEvents = events.filter(
          (event) => event.runId === args.where.runId
        );
        const filtered = args.where.type
          ? runEvents.filter((event) => event.type === args.where.type)
          : runEvents;
        if (filtered.length === 0) return null;
        return filtered.sort((a, b) => b.sequence - a.sequence)[0] ?? null;
      }),
      create: vi.fn(async (args: any) => {
        const now = new Date("2026-03-09T10:00:11.000Z");
        const created = {
          id: `event-${events.length + 1}`,
          ...args.data,
          createdAt: now,
          updatedAt: now,
        };
        events.push(created);
        return created;
      }),
      findMany: vi.fn(async (args: any) => {
        return events
          .filter(
            (event) =>
              event.userId === args.where.userId &&
              (!args.where.runId || event.runId === args.where.runId)
          )
          .sort((a, b) => a.sequence - b.sequence);
      }),
    },
    runToolCall: {
      create: vi.fn(async ({ data }: any) => ({
        id: "call-1",
        ...data,
        createdAt: new Date("2026-03-09T10:00:12.000Z"),
        updatedAt: new Date("2026-03-09T10:00:12.000Z"),
      })),
    },
    runArtifactRef: {
      upsert: vi.fn(async ({ create }: any) => ({
        id: "ref-1",
        ...create,
        createdAt: new Date("2026-03-09T10:00:13.000Z"),
        updatedAt: new Date("2026-03-09T10:00:13.000Z"),
      })),
    },
  };

  return prisma;
}

describe("workflow-orchestrator service", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
    vi.mocked(executeLumigraphTool).mockReset();
  });

  it("returns not-found when the run is not owned", async () => {
    const prisma = makePrismaMock({
      run: makeRun({ userId: "other-user" }),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await executeWorkflowRunForOwner("user-1", "run-1");

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow run not found or you do not own it",
    });
  });

  it("executes instruction and tool steps, persists events, and succeeds", async () => {
    const prisma = makePrismaMock({
      run: makeRun({
        steps: [
          {
            id: "step-1",
            key: "instruction-1",
            position: 1,
            title: "Prep",
            kind: "INSTRUCTION",
            instructions: "Prepare context.",
            toolName: null,
            toolInputTemplateJson: null,
            expectedArtifactType: null,
          },
          {
            id: "step-2",
            key: "get-post",
            position: 2,
            title: "Fetch post",
            kind: "TOOL_CALL",
            instructions: "",
            toolName: "posts.get",
            toolInputTemplateJson: { postId: "{{subject.id}}" },
            expectedArtifactType: "POST",
          },
        ],
      }),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(executeLumigraphTool).mockResolvedValue({
      ok: true,
      data: { id: "post-1" },
    } as never);

    const result = await executeWorkflowRunForOwner("user-1", "run-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.status).toBe("SUCCEEDED");

    expect(executeLumigraphTool).toHaveBeenCalledWith(
      "posts.get",
      { userId: "user-1" },
      { postId: "post-1" }
    );
    expect(prisma.runToolCall.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        runId: "run-1",
        status: "SUCCEEDED",
        toolName: "posts.get",
      }),
    });
    expect(prisma.runArtifactRef.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          runId_artifactType_artifactId: {
            runId: "run-1",
            artifactType: "POST",
            artifactId: "post-1",
          },
        },
      })
    );

    const events = await listRunEventsForOwner("user-1", { runId: "run-1" });
    expect(events.map((event) => event.type)).toContain("run.started");
    expect(events.map((event) => event.type)).toContain("tool_call.succeeded");
    expect(events[events.length - 1]?.type).toBe("run.succeeded");
  });

  it("marks run failed when a tool step fails", async () => {
    const prisma = makePrismaMock({
      run: makeRun({
        steps: [
          {
            id: "step-1",
            key: "create-export",
            position: 1,
            title: "Create export",
            kind: "TOOL_CALL",
            instructions: null,
            toolName: "export_jobs.create",
            toolInputTemplateJson: {
              integrationSetId: "set-1",
              selectedPaths: ["lights"],
              requestOrigin: "https://example.com",
            },
            expectedArtifactType: "DOWNLOAD_JOB",
          },
        ],
      }),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(executeLumigraphTool).mockResolvedValue({
      ok: false,
      code: "BAD_REQUEST",
      message: "Invalid export selection",
    } as never);

    const result = await executeWorkflowRunForOwner("user-1", "run-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.status).toBe("FAILED");
    expect(result.run.errorMessage).toBe("Invalid export selection");

    expect(prisma.runToolCall.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "FAILED",
        errorCode: "BAD_REQUEST",
      }),
    });

    const events = await listRunEventsForOwner("user-1", { runId: "run-1" });
    expect(events.map((event) => event.type)).toContain("tool_call.failed");
    expect(events.map((event) => event.type)).toContain("step.failed");
    expect(events[events.length - 1]?.type).toBe("run.failed");
  });

  it("pauses a review step in waiting-for-input state", async () => {
    const prisma = makePrismaMock({
      run: makeRun({
        steps: [
          {
            id: "step-1",
            key: "review-final",
            position: 1,
            title: "Review final output",
            kind: "REVIEW",
            instructions: "Approve before publish.",
            toolName: null,
            toolInputTemplateJson: null,
            expectedArtifactType: null,
          },
        ],
      }),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await executeWorkflowRunForOwner("user-1", "run-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.status).toBe("WAITING_FOR_INPUT");
    expect(executeLumigraphTool).not.toHaveBeenCalled();

    const events = await listRunEventsForOwner("user-1", { runId: "run-1" });
    expect(events.map((event) => event.type)).toContain(
      "operator.input_requested"
    );
    expect(events.map((event) => event.type)).toContain(
      "run.waiting_for_input"
    );
  });

  it("resumes after a waiting review step by continuing with the next step", async () => {
    const prisma = makePrismaMock({
      run: makeRun({
        id: "run-2",
        trigger: "RESUME",
        steps: [
          {
            id: "step-1",
            key: "review-final",
            position: 1,
            title: "Review",
            kind: "REVIEW",
            instructions: "Review output",
            toolName: null,
            toolInputTemplateJson: null,
            expectedArtifactType: null,
          },
          {
            id: "step-2",
            key: "publish-post",
            position: 2,
            title: "Publish",
            kind: "TOOL_CALL",
            instructions: null,
            toolName: "posts.publish",
            toolInputTemplateJson: { postId: "{{subject.id}}" },
            expectedArtifactType: "POST",
          },
        ],
      }),
      sourceRunStatusById: {
        "run-source": "WAITING_FOR_INPUT",
      },
      seedEvents: [
        {
          id: "event-source-1",
          runId: "run-source",
          userId: "user-1",
          sequence: 1,
          type: "run.waiting_for_input",
          actor: "SYSTEM",
          stepKey: "review-final",
          payloadJson: { requestId: "req-1" },
          occurredAt: new Date("2026-03-09T09:59:00.000Z"),
          createdAt: new Date("2026-03-09T09:59:00.000Z"),
          updatedAt: new Date("2026-03-09T09:59:00.000Z"),
        },
      ],
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(executeLumigraphTool).mockResolvedValue({
      ok: true,
      data: { id: "post-1" },
    } as never);

    const result = await executeWorkflowRunForOwner("user-1", "run-2", {
      sourceRunId: "run-source",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.run.status).toBe("SUCCEEDED");

    const events = await listRunEventsForOwner("user-1", { runId: "run-2" });
    expect(events.map((event) => event.type)).toContain("run.resumed");
    expect(
      events.some(
        (event) =>
          event.type === "step.started" && event.stepKey === "review-final"
      )
    ).toBe(false);
    expect(
      events.some(
        (event) =>
          event.type === "step.started" && event.stepKey === "publish-post"
      )
    ).toBe(true);
  });
});
