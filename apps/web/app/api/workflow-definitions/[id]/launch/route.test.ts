import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, launchWorkflowSessionFromDefinitionForOwnerMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    launchWorkflowSessionFromDefinitionForOwnerMock: vi.fn(),
  }));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  launchWorkflowSessionFromDefinitionForOwner:
    launchWorkflowSessionFromDefinitionForOwnerMock,
}));

import { POST } from "./route";

const definitionId = "01957dfc-7b83-79d4-9a53-f91dc60cf4f2";
const postId = "01957e17-463b-7dfb-adb6-0a73b86f065d";

describe("POST /api/workflow-definitions/:id/launch", () => {
  beforeEach(() => {
    authMock.mockReset();
    launchWorkflowSessionFromDefinitionForOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        `http://localhost/api/workflow-definitions/${definitionId}/launch`,
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        }
      ),
      {
        params: Promise.resolve({ id: definitionId }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to launch a workflow definition",
    });
  });

  it("returns validation errors for malformed params", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(
      new Request(
        "http://localhost/api/workflow-definitions/not-a-uuid/launch",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "content-type": "application/json" },
        }
      ),
      {
        params: Promise.resolve({ id: "not-a-uuid" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid UUID",
    });
  });

  it("returns validation errors when only part of the subject is provided", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const response = await POST(
      new Request(
        `http://localhost/api/workflow-definitions/${definitionId}/launch`,
        {
          method: "POST",
          body: JSON.stringify({
            subjectType: "POST",
          }),
          headers: { "content-type": "application/json" },
        }
      ),
      {
        params: Promise.resolve({ id: definitionId }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "VALIDATION_ERROR",
      message: "subjectType and subjectId must be provided together",
    });
  });

  it("maps launch failures to api errors", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    launchWorkflowSessionFromDefinitionForOwnerMock.mockResolvedValue({
      ok: false,
      code: "INVALID_SUBJECT",
      message: "Workflow subject type does not match the definition",
    });

    const response = await POST(
      new Request(
        `http://localhost/api/workflow-definitions/${definitionId}/launch`,
        {
          method: "POST",
          body: JSON.stringify({
            subjectType: "POST",
            subjectId: postId,
          }),
          headers: { "content-type": "application/json" },
        }
      ),
      {
        params: Promise.resolve({ id: definitionId }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_SUBJECT",
      message: "Workflow subject type does not match the definition",
    });
  });

  it("creates a workflow session and initial run from a definition", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    launchWorkflowSessionFromDefinitionForOwnerMock.mockResolvedValue({
      ok: true,
      session: {
        id: "session-1",
        workflowDefinitionId: definitionId,
        subjectType: "POST",
        subjectId: postId,
        goal: "Run the publish checklist",
        status: "ACTIVE",
        createdAt: "2026-03-08T19:00:00.000Z",
        updatedAt: "2026-03-08T19:00:00.000Z",
      },
      run: {
        id: "run-1",
        sessionId: "session-1",
        status: "RUNNING",
        trigger: "MANUAL",
        agentKind: "workflow-definition",
        model: null,
        summary: null,
        errorMessage: null,
        startedAt: "2026-03-08T19:00:00.000Z",
        completedAt: null,
        cancelledAt: null,
        createdAt: "2026-03-08T19:00:00.000Z",
        updatedAt: "2026-03-08T19:00:00.000Z",
      },
    });

    const response = await POST(
      new Request(
        `http://localhost/api/workflow-definitions/${definitionId}/launch`,
        {
          method: "POST",
          body: JSON.stringify({
            subjectType: "POST",
            subjectId: postId,
            goal: "Run the publish checklist",
          }),
          headers: { "content-type": "application/json" },
        }
      ),
      {
        params: Promise.resolve({ id: definitionId }),
      }
    );

    expect(
      launchWorkflowSessionFromDefinitionForOwnerMock
    ).toHaveBeenCalledWith("user-1", {
      definitionId,
      subject: { type: "POST", id: postId },
      goal: "Run the publish checklist",
      agentKind: undefined,
      model: null,
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      session: {
        id: "session-1",
        workflowDefinitionId: definitionId,
        subjectType: "POST",
        subjectId: postId,
        goal: "Run the publish checklist",
        status: "ACTIVE",
        createdAt: "2026-03-08T19:00:00.000Z",
        updatedAt: "2026-03-08T19:00:00.000Z",
      },
      run: {
        id: "run-1",
        sessionId: "session-1",
        status: "RUNNING",
        trigger: "MANUAL",
        agentKind: "workflow-definition",
        model: null,
        summary: null,
        errorMessage: null,
        startedAt: "2026-03-08T19:00:00.000Z",
        completedAt: null,
        cancelledAt: null,
        createdAt: "2026-03-08T19:00:00.000Z",
        updatedAt: "2026-03-08T19:00:00.000Z",
      },
    });
  });
});
