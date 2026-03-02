import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/artifact", () => ({
  createPresignedUploadForArtifact: vi.fn(),
  ALLOWED_ARTIFACT_CONTENT_TYPES: [
    "application/zip",
    "application/x-fits",
    "image/fits",
  ],
  getMaxArtifactSizeBytes: () => 500 * 1024 * 1024,
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const createPresignedUploadForArtifact = (await import("@/server/services/artifact"))
  .createPresignedUploadForArtifact as ReturnType<typeof vi.fn>;

describe("POST /api/datasets/[id]/artifacts/presign", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(createPresignedUploadForArtifact).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/datasets/123e4567-e89b-12d3-a456-426614174000/artifacts/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: "x.zip",
          contentType: "application/zip",
          contentLength: 100,
        }),
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) }
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("UNAUTHORIZED");
    expect(createPresignedUploadForArtifact).not.toHaveBeenCalled();
  });

  it("returns 400 when dataset id is not a valid UUID", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      new Request("http://localhost/api/datasets/not-a-uuid/artifacts/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: "x.zip",
          contentType: "application/zip",
          contentLength: 100,
        }),
      }),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(createPresignedUploadForArtifact).not.toHaveBeenCalled();
  });

  it("returns 400 when body has invalid contentType (not in allowlist)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      new Request("http://localhost/api/datasets/123e4567-e89b-12d3-a456-426614174000/artifacts/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: "x.zip",
          contentType: "application/octet-stream",
          contentLength: 100,
        }),
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(createPresignedUploadForArtifact).not.toHaveBeenCalled();
  });

  it("returns 404 when service returns null (dataset not found or not owner)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(createPresignedUploadForArtifact).mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/datasets/123e4567-e89b-12d3-a456-426614174000/artifacts/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: "master.fits",
          contentType: "application/x-fits",
          contentLength: 1024,
        }),
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) }
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
  });

  it("returns 200 with uploadUrl and key when service returns result", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(createPresignedUploadForArtifact).mockResolvedValue({
      uploadUrl: "https://bucket.s3.example.com/presigned",
      key: "users/user-1/datasets/ds-1/master.fits",
    });

    const res = await POST(
      new Request("http://localhost/api/datasets/123e4567-e89b-12d3-a456-426614174000/artifacts/presign", {
        method: "POST",
        body: JSON.stringify({
          filename: "master.fits",
          contentType: "application/x-fits",
          contentLength: 1024,
        }),
      }),
      { params: Promise.resolve({ id: "123e4567-e89b-12d3-a456-426614174000" }) }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadUrl).toBe("https://bucket.s3.example.com/presigned");
    expect(json.key).toBe("users/user-1/datasets/ds-1/master.fits");
    expect(createPresignedUploadForArtifact).toHaveBeenCalledWith(
      "123e4567-e89b-12d3-a456-426614174000",
      "user-1",
      {
        filename: "master.fits",
        contentType: "application/x-fits",
        contentLength: 1024,
      }
    );
  });
});
