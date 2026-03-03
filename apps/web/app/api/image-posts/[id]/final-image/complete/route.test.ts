import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/final-image", () => ({
  completeFinalImage: vi.fn(),
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const completeFinalImage = (await import("@/server/services/final-image"))
  .completeFinalImage as ReturnType<typeof vi.fn>;

const postId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/image-posts/[id]/final-image/complete", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(completeFinalImage).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            key: "users/u1/images/p1/final/web.jpg",
            role: "image",
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("UNAUTHORIZED");
    expect(completeFinalImage).not.toHaveBeenCalled();
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(completeFinalImage).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            key: "users/user-1/images/post-1/final/web.jpg",
            role: "image",
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns 200 with post when service returns updated post", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(completeFinalImage).mockResolvedValue({
      id: postId,
      finalImageUrl: "users/user-1/images/post-1/final/web.jpg",
      finalImageThumbUrl: null,
    } as never);

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            key: "users/user-1/images/post-1/final/web.jpg",
            role: "image",
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(postId);
    expect(json.finalImageUrl).toBe("users/user-1/images/post-1/final/web.jpg");
    expect(completeFinalImage).toHaveBeenCalledWith(postId, "user-1", {
      key: "users/user-1/images/post-1/final/web.jpg",
      role: "image",
    });
  });
});
