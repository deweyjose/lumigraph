import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getWorkflowSessionForOwnerMock,
  listWorkflowRunsForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getWorkflowSessionForOwnerMock: vi.fn(),
  listWorkflowRunsForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  getWorkflowSessionForOwner: getWorkflowSessionForOwnerMock,
  listWorkflowRunsForOwner: listWorkflowRunsForOwnerMock,
}));

import { GET } from "./route";

describe("GET /api/workflow-sessions/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    getWorkflowSessionForOwnerMock.mockReset();
    listWorkflowRunsForOwnerMock.mockReset();
  });

  it("returns 404 when the session is not owned", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getWorkflowSessionForOwnerMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/workflow-sessions/01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Workflow session not found or you do not own it",
    });
  });

  it("returns the owned session with its runs", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getWorkflowSessionForOwnerMock.mockResolvedValue({
      id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
      status: "ACTIVE",
    });
    listWorkflowRunsForOwnerMock.mockResolvedValue([{ id: "run-1" }]);

    const response = await GET(
      new Request(
        "http://localhost/api/workflow-sessions/01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(listWorkflowRunsForOwnerMock).toHaveBeenCalledWith("user-1", {
      sessionId: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: {
        id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
        status: "ACTIVE",
      },
      runs: [{ id: "run-1" }],
    });
  });
});
