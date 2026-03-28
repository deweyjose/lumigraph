import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, deleteUnderPathMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  deleteUnderPathMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/assets", () => ({
  deleteIntegrationAssetsUnderPathForOwner: deleteUnderPathMock,
}));

import { POST } from "./route";

const setId = "10000000-0000-4000-8000-000000000001";

describe("POST /api/integration-sets/:id/delete-folder", () => {
  beforeEach(() => {
    authMock.mockReset();
    deleteUnderPathMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "lights" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-json",
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when integration set not found", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteUnderPathMock.mockResolvedValue("not_found");

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "lights" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(deleteUnderPathMock).toHaveBeenCalledWith(setId, "user-1", "lights");
    expect(res.status).toBe(404);
  });

  it("returns 403 when blocked", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteUnderPathMock.mockResolvedValue("forbidden");

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "lights" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for bad path from service", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteUnderPathMock.mockResolvedValue("bad_request");

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "../escape" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(400);
  });

  it("returns deletedCount on success", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteUnderPathMock.mockResolvedValue({ deletedCount: 3 });

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/delete-folder`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: "lights" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deletedCount: 3 });
  });
});
