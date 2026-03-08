import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, retryWorkflowRunForOwnerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  retryWorkflowRunForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  retryWorkflowRunForOwner: retryWorkflowRunForOwnerMock,
}));

import { POST } from "./route";

describe("POST /api/workflow-runs/:id/retry", () => {
  beforeEach(() => {
    authMock.mockReset();
    retryWorkflowRunForOwnerMock.mockReset();
  });

  it("returns 404 for missing owned runs", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    retryWorkflowRunForOwnerMock.mockResolvedValue({
      ok: false,
      code: "NOT_FOUND",
      message: "Workflow run not found or you do not own it",
    });

    const response = await POST(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2/retry",
        {
          method: "POST",
        }
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

  it("returns a new run when retry succeeds", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    retryWorkflowRunForOwnerMock.mockResolvedValue({
      ok: true,
      run: { id: "run-3", trigger: "RETRY" },
    });

    const response = await POST(
      new Request(
        "http://localhost/api/workflow-runs/01957dfc-7b83-79d4-9a53-f91dc60cf4f2/retry",
        {
          method: "POST",
        }
      ),
      {
        params: Promise.resolve({ id: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2" }),
      }
    );

    expect(retryWorkflowRunForOwnerMock).toHaveBeenCalledWith(
      "user-1",
      "01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
    );
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      run: { id: "run-3", trigger: "RETRY" },
    });
  });
});
