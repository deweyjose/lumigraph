import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/server/services/artifact", () => ({
  getPresignedDownloadForArtifact: vi.fn(),
}));

const auth = (await import("auth")).auth as ReturnType<typeof vi.fn>;
const getPresignedDownloadForArtifact = (
  await import("@/server/services/artifact")
).getPresignedDownloadForArtifact as ReturnType<typeof vi.fn>;

const artifactId = "123e4567-e89b-12d3-a456-426614174001";

describe("GET /api/artifacts/[id]/download", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(getPresignedDownloadForArtifact).mockReset();
  });

  it("returns 400 when artifact id is not a valid UUID", async () => {
    const res = await GET(
      new Request("http://localhost/api/artifacts/not-a-uuid/download"),
      { params: Promise.resolve({ id: "not-a-uuid" }) }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("VALIDATION_ERROR");
    expect(getPresignedDownloadForArtifact).not.toHaveBeenCalled();
  });

  it("returns 404 when artifact not found or access denied", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(getPresignedDownloadForArtifact).mockResolvedValue(null);

    const res = await GET(
      new Request(`http://localhost/api/artifacts/${artifactId}/download`),
      { params: Promise.resolve({ id: artifactId }) }
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.code).toBe("NOT_FOUND");
    expect(getPresignedDownloadForArtifact).toHaveBeenCalledWith(
      artifactId,
      "user-1"
    );
  });

  it("calls service with null userId when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(getPresignedDownloadForArtifact).mockResolvedValue(null);

    await GET(
      new Request(`http://localhost/api/artifacts/${artifactId}/download`),
      { params: Promise.resolve({ id: artifactId }) }
    );

    expect(getPresignedDownloadForArtifact).toHaveBeenCalledWith(
      artifactId,
      null
    );
  });

  it("returns 302 redirect to presigned URL when allowed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } });
    vi.mocked(getPresignedDownloadForArtifact).mockResolvedValue({
      downloadUrl: "https://bucket.s3.example.com/presigned-download",
      filename: "data.fits",
    });

    const res = await GET(
      new Request(`http://localhost/api/artifacts/${artifactId}/download`),
      { params: Promise.resolve({ id: artifactId }) }
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "https://bucket.s3.example.com/presigned-download"
    );
    expect(getPresignedDownloadForArtifact).toHaveBeenCalledWith(
      artifactId,
      "user-1"
    );
  });
});
