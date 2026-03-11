import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  cancelAutoThumbForPostOwnerMock,
  getPostForOwnerMock,
  getLatestAutoThumbJobForPostOwnerMock,
  triggerAutoThumbForPostOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  cancelAutoThumbForPostOwnerMock: vi.fn(),
  getPostForOwnerMock: vi.fn(),
  getLatestAutoThumbJobForPostOwnerMock: vi.fn(),
  triggerAutoThumbForPostOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/posts", () => ({
  getPostForOwner: getPostForOwnerMock,
}));

vi.mock("@/server/services/auto-thumb-jobs", () => ({
  getLatestAutoThumbJobForPostOwner: getLatestAutoThumbJobForPostOwnerMock,
}));

vi.mock("@/server/services/auto-thumb-runtime", () => ({
  cancelAutoThumbForPostOwner: cancelAutoThumbForPostOwnerMock,
  triggerAutoThumbForPostOwner: triggerAutoThumbForPostOwnerMock,
}));

import { DELETE, GET, POST } from "./route";

describe("GET /api/posts/:id/auto-thumb", () => {
  beforeEach(() => {
    authMock.mockReset();
    getPostForOwnerMock.mockReset();
    getLatestAutoThumbJobForPostOwnerMock.mockReset();
    cancelAutoThumbForPostOwnerMock.mockReset();
    triggerAutoThumbForPostOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/auto-thumb"),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(response.status).toBe(401);
  });

  it("returns the latest job for the owned post", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getPostForOwnerMock.mockResolvedValue({ id: "post-1" });
    getLatestAutoThumbJobForPostOwnerMock.mockResolvedValue({
      id: "job-1",
      status: "RUNNING",
      attempts: 1,
      errorMessage: null,
      updatedAt: "2026-03-10T12:00:00.000Z",
    });

    const response = await GET(
      new Request("http://localhost/api/posts/post-1/auto-thumb"),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      job: {
        id: "job-1",
        status: "RUNNING",
        attempts: 1,
        errorMessage: null,
        updatedAt: "2026-03-10T12:00:00.000Z",
      },
    });
  });
});

describe("POST /api/posts/:id/auto-thumb", () => {
  beforeEach(() => {
    authMock.mockReset();
    getPostForOwnerMock.mockReset();
    getLatestAutoThumbJobForPostOwnerMock.mockReset();
    cancelAutoThumbForPostOwnerMock.mockReset();
    triggerAutoThumbForPostOwnerMock.mockReset();
  });

  it("starts manual thumbnail generation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    triggerAutoThumbForPostOwnerMock.mockResolvedValue({
      ok: true,
      invoked: true,
      job: {
        id: "job-1",
        status: "PENDING",
        attempts: 0,
        errorMessage: null,
        updatedAt: "2026-03-10T12:00:00.000Z",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/auto-thumb", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(triggerAutoThumbForPostOwnerMock).toHaveBeenCalledWith(
      "user-1",
      "post-1",
      { requestOrigin: "http://localhost" }
    );
    expect(response.status).toBe(200);
  });

  it("returns a conflict when no final image is available", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    triggerAutoThumbForPostOwnerMock.mockResolvedValue({
      ok: false,
      code: "NO_FINAL_IMAGE",
      message: "Upload a final image before generating a thumbnail.",
    });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/auto-thumb", {
        method: "POST",
      }),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "NO_FINAL_IMAGE",
      message: "Upload a final image before generating a thumbnail.",
    });
  });

  it("cancels thumbnail generation", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    cancelAutoThumbForPostOwnerMock.mockResolvedValue({
      ok: true,
      job: {
        id: "job-1",
        status: "CANCELLED",
        attempts: 1,
        errorMessage: null,
        updatedAt: "2026-03-10T12:00:00.000Z",
      },
    });

    const response = await DELETE(
      new Request("http://localhost/api/posts/post-1/auto-thumb", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(cancelAutoThumbForPostOwnerMock).toHaveBeenCalledWith(
      "user-1",
      "post-1"
    );
    expect(response.status).toBe(200);
  });
});
