import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/final-image", () => ({
  getPresignedFinalImageUrl: vi.fn(),
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const getPresignedFinalImageUrl = (await import("@/server/services/final-image"))
  .getPresignedFinalImageUrl as ReturnType<typeof vi.fn>;

const postId = "123e4567-e89b-12d3-a456-426614174000";

describe("GET /api/image-posts/[id]/assets/[role]", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(getPresignedFinalImageUrl).mockReset();
  });

  it("returns 400 for invalid role", async () => {
    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: postId, role: "invalid" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(getPresignedFinalImageUrl).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid id (not UUID)", async () => {
    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: "not-a-uuid", role: "image" }),
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(getPresignedFinalImageUrl).not.toHaveBeenCalled();
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(getPresignedFinalImageUrl).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: postId, role: "image" }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
    expect(getPresignedFinalImageUrl).toHaveBeenCalledWith(
      postId,
      "image",
      "user-1"
    );
  });

  it("redirects to presigned URL for role image", async () => {
    const presignedUrl = "https://bucket.s3.amazonaws.com/key?signature=abc";
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(getPresignedFinalImageUrl).mockResolvedValue(presignedUrl);

    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: postId, role: "image" }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(presignedUrl);
    expect(getPresignedFinalImageUrl).toHaveBeenCalledWith(
      postId,
      "image",
      "user-1"
    );
  });

  it("redirects to presigned URL for role thumb", async () => {
    const presignedUrl = "https://bucket.s3.amazonaws.com/thumb?signature=xyz";
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(getPresignedFinalImageUrl).mockResolvedValue(presignedUrl);

    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: postId, role: "thumb" }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(presignedUrl);
    expect(getPresignedFinalImageUrl).toHaveBeenCalledWith(
      postId,
      "thumb",
      "user-1"
    );
  });

  it("allows unauthenticated when post is public (userId null)", async () => {
    const presignedUrl = "https://bucket.s3.amazonaws.com/key?signature=abc";
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(getPresignedFinalImageUrl).mockResolvedValue(presignedUrl);

    const res = await GET(new Request("http://localhost/"), {
      params: Promise.resolve({ id: postId, role: "image" }),
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(presignedUrl);
    expect(getPresignedFinalImageUrl).toHaveBeenCalledWith(
      postId,
      "image",
      null
    );
  });
});
