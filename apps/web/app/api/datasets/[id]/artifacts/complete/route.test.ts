import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/artifact", () => ({
  registerArtifact: vi.fn(),
  ALLOWED_ARTIFACT_CONTENT_TYPES: [
    "application/zip",
    "application/x-fits",
    "image/fits",
  ],
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const registerArtifact = (await import("@/server/services/artifact"))
  .registerArtifact as ReturnType<typeof vi.fn>;

const datasetId = "123e4567-e89b-12d3-a456-426614174000";

describe("POST /api/datasets/[id]/artifacts/complete", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(registerArtifact).mockReset();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/datasets/${datasetId}/artifacts/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "data.zip",
            fileType: "application/zip",
            s3Key: "users/u1/datasets/d1/data.zip",
            sizeBytes: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: datasetId }) }
    );

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.code).toBe("UNAUTHORIZED");
    expect(registerArtifact).not.toHaveBeenCalled();
  });

  it("returns 400 when dataset id is not a valid UUID", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      new Request(
        "http://localhost/api/datasets/not-a-uuid/artifacts/complete",
        {
          method: "POST",
          body: JSON.stringify({
            filename: "data.zip",
            fileType: "application/zip",
            s3Key: "users/u1/datasets/d1/data.zip",
            sizeBytes: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(registerArtifact).not.toHaveBeenCalled();
  });

  it("returns 400 when body is invalid (missing required fields)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });

    const res = await POST(
      new Request(
        `http://localhost/api/datasets/${datasetId}/artifacts/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "data.zip",
            // missing fileType, s3Key, sizeBytes
          }),
        }
      ),
      { params: Promise.resolve({ id: datasetId }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(registerArtifact).not.toHaveBeenCalled();
  });

  it("returns 404 when dataset not found or not owned", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(registerArtifact).mockResolvedValue(null);

    const res = await POST(
      new Request(
        `http://localhost/api/datasets/${datasetId}/artifacts/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "data.zip",
            fileType: "application/zip",
            s3Key: "users/u1/datasets/d1/data.zip",
            sizeBytes: 1024,
          }),
        }
      ),
      { params: Promise.resolve({ id: datasetId }) }
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
    expect(registerArtifact).toHaveBeenCalledWith(
      datasetId,
      "user-1",
      expect.objectContaining({
        filename: "data.zip",
        fileType: "application/zip",
        s3Key: "users/u1/datasets/d1/data.zip",
        sizeBytes: BigInt(1024),
      })
    );
  });

  it("returns 201 and artifact when registration succeeds", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    const created = {
      id: "artifact-1",
      datasetId,
      filename: "data.zip",
      fileType: "application/zip",
      s3Key: "users/u1/datasets/d1/data.zip",
      sizeBytes: BigInt(1024),
      checksum: "sha256-abc",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    vi.mocked(registerArtifact).mockResolvedValue(created);

    const res = await POST(
      new Request(
        `http://localhost/api/datasets/${datasetId}/artifacts/complete`,
        {
          method: "POST",
          body: JSON.stringify({
            filename: "data.zip",
            fileType: "application/zip",
            s3Key: "users/u1/datasets/d1/data.zip",
            sizeBytes: 1024,
            checksum: "sha256-abc",
          }),
        }
      ),
      { params: Promise.resolve({ id: datasetId }) }
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.id).toBe("artifact-1");
    expect(json.datasetId).toBe(datasetId);
    expect(json.filename).toBe("data.zip");
    expect(json.fileType).toBe("application/zip");
    expect(json.s3Key).toBe("users/u1/datasets/d1/data.zip");
    expect(json.sizeBytes).toBe(1024);
    expect(json.checksum).toBe("sha256-abc");
    expect(registerArtifact).toHaveBeenCalledWith(
      datasetId,
      "user-1",
      expect.objectContaining({
        filename: "data.zip",
        fileType: "application/zip",
        s3Key: "users/u1/datasets/d1/data.zip",
        sizeBytes: BigInt(1024),
        checksum: "sha256-abc",
      })
    );
  });
});
