import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getPostForOwnerMock,
  updatePostDraftMock,
  deletePostForOwnerMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getPostForOwnerMock: vi.fn(),
  updatePostDraftMock: vi.fn(),
  deletePostForOwnerMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/posts", () => ({
  getPostForOwner: getPostForOwnerMock,
  updatePostDraft: updatePostDraftMock,
  deletePostForOwner: deletePostForOwnerMock,
}));

import { DELETE, GET } from "./route";

describe("GET /api/posts/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    getPostForOwnerMock.mockReset();
    updatePostDraftMock.mockReset();
    deletePostForOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/posts/123"), {
      params: Promise.resolve({ id: "123" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to view a post",
    });
  });

  it("returns 404 when the post is not owned by the caller", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getPostForOwnerMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/posts/123"), {
      params: Promise.resolve({ id: "123" }),
    });

    expect(getPostForOwnerMock).toHaveBeenCalledWith("123", "user-1");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Post not found or you do not own it",
    });
  });

  it("returns the owned post payload", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getPostForOwnerMock.mockResolvedValue({
      id: "post-1",
      title: "M31",
      status: "DRAFT",
      finalImageAsset: null,
      finalThumbAsset: null,
      integrationSets: [],
    });

    const response = await GET(
      new Request("http://localhost/api/posts/post-1"),
      {
        params: Promise.resolve({ id: "post-1" }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "post-1",
      title: "M31",
      status: "DRAFT",
      finalImageAsset: null,
      finalThumbAsset: null,
      integrationSets: [],
    });
  });

  it("returns 400 when the route param is missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    const response = await GET(new Request("http://localhost/api/posts"), {
      params: Promise.resolve({ id: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "BAD_REQUEST",
      message: "Missing post id",
    });
  });
});

describe("DELETE /api/posts/:id", () => {
  beforeEach(() => {
    authMock.mockReset();
    deletePostForOwnerMock.mockReset();
  });

  it("rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost/api/posts/post-1"),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Sign in to delete a post",
    });
  });

  it("returns 404 when the post is not owned by the caller", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deletePostForOwnerMock.mockResolvedValue("not_found");

    const response = await DELETE(
      new Request("http://localhost/api/posts/post-1"),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(deletePostForOwnerMock).toHaveBeenCalledWith("post-1", "user-1");
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Post not found or you do not own it",
    });
  });

  it("returns 204 when deleted", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    deletePostForOwnerMock.mockResolvedValue("deleted");

    const response = await DELETE(
      new Request("http://localhost/api/posts/post-1"),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(204);
  });
});
