import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getWorkflowRunForOwnerMock,
  listRunToolCallsForOwnerMock,
  listRunArtifactRefsForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getWorkflowRunForOwnerMock: vi.fn(),
  listRunToolCallsForOwnerMock: vi.fn(),
  listRunArtifactRefsForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  getWorkflowRunForOwner: getWorkflowRunForOwnerMock,
  listRunToolCallsForOwner: listRunToolCallsForOwnerMock,
  listRunArtifactRefsForOwner: listRunArtifactRefsForOwnerMock,
}));

import { GET } from "./route";

describe("GET /api/workflow-runs/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    getWorkflowRunForOwnerMock.mockReset();
    listRunToolCallsForOwnerMock.mockReset();
    listRunArtifactRefsForOwnerMock.mockReset();
  });

  it("returns 404 when the run is not owned", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getWorkflowRunForOwnerMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Workflow run not found or you do not own it",
    });
  });

  it("returns the owned run with tool-call and artifact history", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getWorkflowRunForOwnerMock.mockResolvedValue({
      id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
      status: "FAILED",
    });
    listRunToolCallsForOwnerMock.mockResolvedValue([{ id: "call-1" }]);
    listRunArtifactRefsForOwnerMock.mockResolvedValue([{ id: "ref-1" }]);

    const response = await GET(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(listRunToolCallsForOwnerMock).toHaveBeenCalledWith("user-1", {
      runId: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
    });
    expect(listRunArtifactRefsForOwnerMock).toHaveBeenCalledWith("user-1", {
      runId: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      run: {
        id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
        status: "FAILED",
      },
      toolCalls: [{ id: "call-1" }],
      artifactRefs: [{ id: "ref-1" }],
    });
  });
});
