import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, listWorkflowRunsForOwnerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  listWorkflowRunsForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  listWorkflowRunsForOwner: listWorkflowRunsForOwnerMock,
}));

import { GET } from "./route";

describe("GET /api/workflow-runs", () => {
  beforeEach(() => {
    authMock.mockReset();
    listWorkflowRunsForOwnerMock.mockReset();
  });

  it("returns validation errors for malformed sessionId filters", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET(
      new Request("http://localhost/api/workflow-runs?sessionId=not-a-uuid")
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "VALIDATION_ERROR",
      message: "Invalid UUID",
    });
  });

  it("lists owned runs with an optional session filter", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    listWorkflowRunsForOwnerMock.mockResolvedValue([{ id: "run-1" }]);

    const response = await GET(
      new Request(
        "http://localhost/api/workflow-runs?sessionId=01957dfc-7b83-79d4-9a53-f91dc60cf4f2"
      )
    );

    expect(listWorkflowRunsForOwnerMock).toHaveBeenCalledWith("user-1", {
      sessionId: "01957dfc-7b83-79d4-9a53-f91dc60cf4f2",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      runs: [{ id: "run-1" }],
    });
  });
});
