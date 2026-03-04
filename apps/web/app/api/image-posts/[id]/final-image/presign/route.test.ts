import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/final-image", () => ({
  createPresignedUploadForFinalImage: vi.fn(),
  ALLOWED_FINAL_IMAGE_CONTENT_TYPES: ["image/jpeg", "image/png", "image/webp"],
  getMaxFinalImageSizeBytes: () => 20 * 1024 * 1024,
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const createPresignedUploadForFinalImage = (
  await import("@/server/services/final-image")
).createPresignedUploadForFinalImage as ReturnType<typeof vi.fn>;

const postId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/image-posts/[id]/final-image/presign", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(createPresignedUploadForFinalImage).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "web.jpg",
            contentType: "image/jpeg",
            contentLength: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("UNAUTHORIZED");
    expect(createPresignedUploadForFinalImage).not.toHaveBeenCalled();
  });

  it("returns 404 when service returns null", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(createPresignedUploadForFinalImage).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "web.jpg",
            contentType: "image/jpeg",
            contentLength: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns 200 with uploadUrl and key when service returns result", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(createPresignedUploadForFinalImage).mockResolvedValue({
      uploadUrl: "https://s3.example.com/presigned",
      key: "users/user-1/images/post-1/final/web.jpg",
    });

    const res = await POST(
      new Request(
        `http://localhost/api/image-posts/${postId}/final-image/presign`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "web.jpg",
            contentType: "image/jpeg",
            contentLength: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: postId }) }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadUrl).toBe("https://s3.example.com/presigned");
    expect(json.key).toBe("users/user-1/images/post-1/final/web.jpg");
    expect(createPresignedUploadForFinalImage).toHaveBeenCalledWith(
      postId,
      "user-1",
      {
        filename: "web.jpg",
        contentType: "image/jpeg",
        contentLength: 1024,
      }
    );
  });
});
