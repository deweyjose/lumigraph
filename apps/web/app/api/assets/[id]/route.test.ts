import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, deleteIntegrationAssetForOwnerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  deleteIntegrationAssetForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/assets", () => ({
  deleteIntegrationAssetForOwner: deleteIntegrationAssetForOwnerMock,
}));

import { DELETE } from "./route";

describe("DELETE /api/assets/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    deleteIntegrationAssetForOwnerMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    const res = await DELETE(
      new Request(
        "http://localhost/api/assets/00000000-0000-4000-8000-000000000001"
      ),
      {
        params: Promise.resolve({
          id: "00000000-0000-4000-8000-000000000001",
        }),
      }
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 for non-uuid id", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const res = await DELETE(
      new Request("http://localhost/api/assets/not-a-uuid"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when asset not found", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteIntegrationAssetForOwnerMock.mockResolvedValue("not_found");

    const res = await DELETE(
      new Request(
        "http://localhost/api/assets/00000000-0000-4000-8000-000000000002"
      ),
      {
        params: Promise.resolve({
          id: "00000000-0000-4000-8000-000000000002",
        }),
      }
    );

    expect(deleteIntegrationAssetForOwnerMock).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000002",
      "user-1"
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when delete forbidden", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteIntegrationAssetForOwnerMock.mockResolvedValue("forbidden");

    const res = await DELETE(
      new Request(
        "http://localhost/api/assets/00000000-0000-4000-8000-000000000003"
      ),
      {
        params: Promise.resolve({
          id: "00000000-0000-4000-8000-000000000003",
        }),
      }
    );

    expect(res.status).toBe(403);
  });

  it("returns ok when deleted", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deleteIntegrationAssetForOwnerMock.mockResolvedValue("deleted");

    const res = await DELETE(
      new Request(
        "http://localhost/api/assets/00000000-0000-4000-8000-000000000004"
      ),
      {
        params: Promise.resolve({
          id: "00000000-0000-4000-8000-000000000004",
        }),
      }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
