import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  resumeWorkflowRunForOwnerMock,
  executeWorkflowRunForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  resumeWorkflowRunForOwnerMock: vi.fn(),
  executeWorkflowRunForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  resumeWorkflowRunForOwner: resumeWorkflowRunForOwnerMock,
}));

vi.mock("@/server/services/workflow-orchestrator", () => ({
  executeWorkflowRunForOwner: executeWorkflowRunForOwnerMock,
}));

import { POST } from "./route";

describe("POST /api/workflow-runs/:id/resume", () => {
  beforeEach(() => {
    authMock.mockReset();
    resumeWorkflowRunForOwnerMock.mockReset();
    executeWorkflowRunForOwnerMock.mockReset();
  });

  it("returns invalid-state errors from the resume service", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    resumeWorkflowRunForOwnerMock.mockResolvedValue({
      ok: false,
      code: "INVALID_STATE",
      message: "Only pending, failed, or waiting-for-input runs can be resumed",
    });

    const response = await POST(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2/resume",
        {
          method: "POST",
        }
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "INVALID_STATE",
      message: "Only pending, failed, or waiting-for-input runs can be resumed",
    });
  });

  it("returns a new run when resume succeeds", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    resumeWorkflowRunForOwnerMock.mockResolvedValue({
      ok: true,
      run: { id: "run-2", trigger: "RESUME" },
    });
    executeWorkflowRunForOwnerMock.mockResolvedValue({
      ok: true,
      run: { id: "run-2", trigger: "RESUME", status: "SUCCEEDED" },
    });

    const response = await POST(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2/resume",
        {
          method: "POST",
        }
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(resumeWorkflowRunForOwnerMock).toHaveBeenCalledWith(
      "user-1",
      "01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
    );
    expect(executeWorkflowRunForOwnerMock).toHaveBeenCalledWith(
      "user-1",
      "run-2",
      {
        sourceRunId: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
      }
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      run: { id: "run-2", trigger: "RESUME", status: "SUCCEEDED" },
    });
  });
});
