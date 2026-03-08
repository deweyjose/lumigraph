import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, listWorkflowSessionsForOwnerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  listWorkflowSessionsForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/workflow-runs", () => ({
  listWorkflowSessionsForOwner: listWorkflowSessionsForOwnerMock,
}));

import { GET } from "./route";

describe("GET /api/workflow-sessions", () => {
  beforeEach(() => {
    authMock.mockReset();
    listWorkflowSessionsForOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to view workflow sessions",
    });
  });

  it("returns owned workflow sessions", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    listWorkflowSessionsForOwnerMock.mockResolvedValue([
      { id: "session-1", status: "ACTIVE" },
    ]);

    const response = await GET();

    expect(listWorkflowSessionsForOwnerMock).toHaveBeenCalledWith("user-1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: [{ id: "session-1", status: "ACTIVE" }],
    });
  });
});
