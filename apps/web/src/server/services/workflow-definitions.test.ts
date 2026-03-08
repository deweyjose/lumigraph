import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma as PrismaClient } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";
import {
  archiveWorkflowDefinitionForOwner,
  createWorkflowDefinitionForOwner,
  getWorkflowDefinitionForOwner,
  listWorkflowDefinitionsForOwner,
  updateWorkflowDefinitionForOwner,
} from "./workflow-definitions";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

function makePrismaMock() {
  return {
    workflowDefinition: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("workflow-definitions service", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("lists owned workflow definitions newest first", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findMany.mockResolvedValue([
      {
        id: "definition-1",
        title: "Post publish checklist",
        description: "Review final assets",
        subjectType: "POST",
        status: "ACTIVE",
        createdAt: new Date("2026-03-08T12:00:00.000Z"),
        updatedAt: new Date("2026-03-08T12:30:00.000Z"),
        _count: { steps: 2 },
      },
    ]);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await listWorkflowDefinitionsForOwner("user-1");

    expect(prisma.workflowDefinition.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        _count: {
          select: { steps: true },
        },
      },
    });
    expect(result).toEqual([
      {
        id: "definition-1",
        title: "Post publish checklist",
        description: "Review final assets",
        subjectType: "POST",
        status: "ACTIVE",
        stepCount: 2,
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:30:00.000Z",
      },
    ]);
  });

  it("returns null when a workflow definition is missing or unowned", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findUnique.mockResolvedValue({
      id: "definition-1",
      userId: "other-user",
      title: "Post publish checklist",
      description: null,
      subjectType: "POST",
      status: "DRAFT",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:00:00.000Z"),
      steps: [],
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await getWorkflowDefinitionForOwner(
      "user-1",
      "definition-1"
    );

    expect(result).toBeNull();
  });

  it("creates a workflow definition with ordered steps", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.create.mockResolvedValue({
      id: "definition-1",
      title: "Post publish checklist",
      description: "Review final assets",
      subjectType: "POST",
      status: "ACTIVE",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:00:00.000Z"),
      steps: [
        {
          id: "step-1",
          key: "review-final-assets",
          position: 1,
          title: "Review final assets",
          kind: "INSTRUCTION",
          instructions: "Check framing and star shape",
          toolName: null,
          toolInputTemplateJson: null,
          expectedArtifactType: "ASSET",
          createdAt: new Date("2026-03-08T12:00:00.000Z"),
          updatedAt: new Date("2026-03-08T12:00:00.000Z"),
        },
        {
          id: "step-2",
          key: "publish-post",
          position: 2,
          title: "Publish post",
          kind: "TOOL_CALL",
          instructions: null,
          toolName: "posts.publish",
          toolInputTemplateJson: { postId: "{{subjectId}}" },
          expectedArtifactType: "POST",
          createdAt: new Date("2026-03-08T12:00:00.000Z"),
          updatedAt: new Date("2026-03-08T12:00:00.000Z"),
        },
      ],
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "  Post publish checklist  ",
      description: "  Review final assets  ",
      subjectType: "POST",
      status: "ACTIVE",
      steps: [
        {
          key: "publish-post",
          position: 2,
          title: " Publish post ",
          kind: "TOOL_CALL",
          toolName: "posts.publish",
          toolInputTemplateJson: { postId: "{{subjectId}}" },
          expectedArtifactType: "POST",
        },
        {
          key: "review-final-assets",
          position: 1,
          title: " Review final assets ",
          kind: "INSTRUCTION",
          instructions: " Check framing and star shape ",
          expectedArtifactType: "ASSET",
        },
      ],
    });

    expect(prisma.workflowDefinition.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        title: "Post publish checklist",
        description: "Review final assets",
        subjectType: "POST",
        status: "ACTIVE",
        steps: {
          create: [
            {
              key: "review-final-assets",
              position: 1,
              title: "Review final assets",
              kind: "INSTRUCTION",
              instructions: "Check framing and star shape",
              toolName: null,
              toolInputTemplateJson: PrismaClient.JsonNull,
              expectedArtifactType: "ASSET",
            },
            {
              key: "publish-post",
              position: 2,
              title: "Publish post",
              kind: "TOOL_CALL",
              instructions: null,
              toolName: "posts.publish",
              toolInputTemplateJson: { postId: "{{subjectId}}" },
              expectedArtifactType: "POST",
            },
          ],
        },
      },
      include: {
        steps: {
          orderBy: [{ position: "asc" }],
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      definition: {
        id: "definition-1",
        title: "Post publish checklist",
        description: "Review final assets",
        subjectType: "POST",
        status: "ACTIVE",
        steps: [
          {
            id: "step-1",
            key: "review-final-assets",
            position: 1,
            title: "Review final assets",
            kind: "INSTRUCTION",
            instructions: "Check framing and star shape",
            toolName: null,
            toolInputTemplateJson: null,
            expectedArtifactType: "ASSET",
            createdAt: "2026-03-08T12:00:00.000Z",
            updatedAt: "2026-03-08T12:00:00.000Z",
          },
          {
            id: "step-2",
            key: "publish-post",
            position: 2,
            title: "Publish post",
            kind: "TOOL_CALL",
            instructions: null,
            toolName: "posts.publish",
            toolInputTemplateJson: { postId: "{{subjectId}}" },
            expectedArtifactType: "POST",
            createdAt: "2026-03-08T12:00:00.000Z",
            updatedAt: "2026-03-08T12:00:00.000Z",
          },
        ],
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:00:00.000Z",
      },
    });
  });

  it("rejects workflow definition creation with an empty title", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "   ",
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Workflow definition title is required",
    });
    expect(prisma.workflowDefinition.create).not.toHaveBeenCalled();
  });

  it("rejects non-contiguous workflow step positions", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "Post publish checklist",
      steps: [
        {
          key: "publish-post",
          position: 2,
          title: "Publish post",
          kind: "TOOL_CALL",
          toolName: "posts.publish",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Workflow step positions must be contiguous starting at 1",
    });
  });

  it("rejects duplicate workflow step keys", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "Post publish checklist",
      steps: [
        {
          key: "publish-post",
          position: 1,
          title: "Publish post",
          kind: "TOOL_CALL",
          toolName: "posts.publish",
        },
        {
          key: "publish-post",
          position: 2,
          title: "Publish post again",
          kind: "TOOL_CALL",
          toolName: "posts.publish",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        'Workflow step key "publish-post" must be unique within the definition',
    });
  });

  it("rejects workflow tool steps that reference unknown tools", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "Post publish checklist",
      steps: [
        {
          key: "do-the-thing",
          position: 1,
          title: "Do the thing",
          kind: "TOOL_CALL",
          toolName: "posts.destroy",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: 'Workflow tool step "do-the-thing" references an unknown tool',
    });
  });

  it("rejects non-tool steps that define tool fields", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "Post publish checklist",
      steps: [
        {
          key: "review-final-assets",
          position: 1,
          title: "Review final assets",
          kind: "INSTRUCTION",
          toolName: "posts.publish",
        },
      ],
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message:
        'Workflow step "review-final-assets" cannot define a tool name unless it is a TOOL_CALL step',
    });
  });

  it("rejects active workflow definitions without steps", async () => {
    const prisma = makePrismaMock();
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await createWorkflowDefinitionForOwner("user-1", {
      title: "Post publish checklist",
      status: "ACTIVE",
      steps: [],
    });

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Active workflow definitions must contain at least one step",
    });
  });

  it("updates an owned workflow definition and replaces its steps", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findUnique.mockResolvedValueOnce({
      id: "definition-1",
      userId: "user-1",
    });
    prisma.workflowDefinition.update.mockResolvedValue({
      id: "definition-1",
      title: "Integration QC",
      description: null,
      subjectType: "INTEGRATION_SET",
      status: "ACTIVE",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:15:00.000Z"),
      steps: [
        {
          id: "step-1",
          key: "inspect-assets",
          position: 1,
          title: "Inspect assets",
          kind: "TOOL_CALL",
          instructions: null,
          toolName: "assets.list_integration_set",
          toolInputTemplateJson: { integrationSetId: "{{subjectId}}" },
          expectedArtifactType: "ASSET",
          createdAt: new Date("2026-03-08T12:15:00.000Z"),
          updatedAt: new Date("2026-03-08T12:15:00.000Z"),
        },
      ],
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await updateWorkflowDefinitionForOwner(
      "user-1",
      "definition-1",
      {
        title: "Integration QC",
        subjectType: "INTEGRATION_SET",
        status: "ACTIVE",
        steps: [
          {
            key: "inspect-assets",
            position: 1,
            title: "Inspect assets",
            kind: "TOOL_CALL",
            toolName: "assets.list_integration_set",
            toolInputTemplateJson: { integrationSetId: "{{subjectId}}" },
            expectedArtifactType: "ASSET",
          },
        ],
      }
    );

    expect(prisma.workflowDefinition.update).toHaveBeenCalledWith({
      where: { id: "definition-1" },
      data: {
        title: "Integration QC",
        description: null,
        subjectType: "INTEGRATION_SET",
        status: "ACTIVE",
        steps: {
          deleteMany: {},
          create: [
            {
              key: "inspect-assets",
              position: 1,
              title: "Inspect assets",
              kind: "TOOL_CALL",
              instructions: null,
              toolName: "assets.list_integration_set",
              toolInputTemplateJson: { integrationSetId: "{{subjectId}}" },
              expectedArtifactType: "ASSET",
            },
          ],
        },
      },
      include: {
        steps: {
          orderBy: [{ position: "asc" }],
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      definition: {
        id: "definition-1",
        title: "Integration QC",
        description: null,
        subjectType: "INTEGRATION_SET",
        status: "ACTIVE",
        steps: [
          {
            id: "step-1",
            key: "inspect-assets",
            position: 1,
            title: "Inspect assets",
            kind: "TOOL_CALL",
            instructions: null,
            toolName: "assets.list_integration_set",
            toolInputTemplateJson: { integrationSetId: "{{subjectId}}" },
            expectedArtifactType: "ASSET",
            createdAt: "2026-03-08T12:15:00.000Z",
            updatedAt: "2026-03-08T12:15:00.000Z",
          },
        ],
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:15:00.000Z",
      },
    });
  });

  it("returns not found when updating an unowned workflow definition", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findUnique.mockResolvedValue({
      id: "definition-1",
      userId: "other-user",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await updateWorkflowDefinitionForOwner(
      "user-1",
      "definition-1",
      {
        title: "Integration QC",
      }
    );

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow definition not found or you do not own it",
    });
    expect(prisma.workflowDefinition.update).not.toHaveBeenCalled();
  });

  it("archives an owned workflow definition", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findUnique.mockResolvedValueOnce({
      id: "definition-1",
      userId: "user-1",
    });
    prisma.workflowDefinition.update.mockResolvedValue({
      id: "definition-1",
      title: "Post publish checklist",
      description: null,
      subjectType: "POST",
      status: "ARCHIVED",
      createdAt: new Date("2026-03-08T12:00:00.000Z"),
      updatedAt: new Date("2026-03-08T12:45:00.000Z"),
      steps: [],
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await archiveWorkflowDefinitionForOwner(
      "user-1",
      "definition-1"
    );

    expect(prisma.workflowDefinition.update).toHaveBeenCalledWith({
      where: { id: "definition-1" },
      data: {
        status: "ARCHIVED",
      },
      include: {
        steps: {
          orderBy: [{ position: "asc" }],
        },
      },
    });
    expect(result).toEqual({
      ok: true,
      definition: {
        id: "definition-1",
        title: "Post publish checklist",
        description: null,
        subjectType: "POST",
        status: "ARCHIVED",
        steps: [],
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:45:00.000Z",
      },
    });
  });

  it("returns not found when archiving an unowned workflow definition", async () => {
    const prisma = makePrismaMock();
    prisma.workflowDefinition.findUnique.mockResolvedValue({
      id: "definition-1",
      userId: "other-user",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await archiveWorkflowDefinitionForOwner(
      "user-1",
      "definition-1"
    );

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow definition not found or you do not own it",
    });
    expect(prisma.workflowDefinition.update).not.toHaveBeenCalled();
  });
});
