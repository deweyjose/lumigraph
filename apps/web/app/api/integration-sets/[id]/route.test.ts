import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, deleteIntegrationSetForOwnerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  deleteIntegrationSetForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/integration-sets", () => ({
  deleteIntegrationSetForOwner: deleteIntegrationSetForOwnerMock,
  getIntegrationSetForOwner: vi.fn(),
  updateIntegrationSet: vi.fn(),
}));

import { DELETE } from "./route";

describe("DELETE /api/integration-sets/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    deleteIntegrationSetForOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/integration-sets/set-1"),
      { params: Promise.resolve({ id: "set-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to delete integration sets",
    });
  });

  it("returns 404 when the set is not owned by the caller", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteIntegrationSetForOwnerMock.mockResolvedValue("not_found");

    const response = await DELETE(
      new Request("http://localhost/api/integration-sets/set-1"),
      { params: Promise.resolve({ id: "set-1" }) }
    );

    expect(deleteIntegrationSetForOwnerMock).toHaveBeenCalledWith(
      "set-1",
      "user-1"
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Integration set not found",
    });
  });

  it("returns 204 when deleted", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteIntegrationSetForOwnerMock.mockResolvedValue("deleted");

    const response = await DELETE(
      new Request("http://localhost/api/integration-sets/set-1"),
      { params: Promise.resolve({ id: "set-1" }) }
    );

    expect(response.status).toBe(204);
  });
});
