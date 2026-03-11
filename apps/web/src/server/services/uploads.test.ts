import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");
const uploads = await import("./uploads");

function makePrismaMock() {
  return {
    asset: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe("uploads service", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("marks a presigned final image upload as uploaded", async () => {
    const prisma = makePrismaMock();
    prisma.asset.findUnique.mockResolvedValue({
      id: "asset-1",
      userId: "user-1",
      postId: "post-1",
      kind: "FINAL_IMAGE",
      s3Key: "users/user-1/posts/post-1/final.fits",
      status: "PRESIGNED",
      checksum: null,
      updatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });
    prisma.asset.update.mockResolvedValue({
      id: "asset-1",
      userId: "user-1",
      postId: "post-1",
      kind: "FINAL_IMAGE",
      s3Key: "users/user-1/posts/post-1/final.fits",
      status: "UPLOADED",
      sizeBytes: 500n,
      checksum: "abc123",
      updatedAt: new Date("2026-03-08T12:01:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await uploads.completeUpload(
      "user-1",
      "asset-1",
      500n,
      "abc123"
    );

    expect(result?.status).toBe("UPLOADED");
    expect(prisma.asset.update).toHaveBeenCalledOnce();
  });

  it("treats duplicate complete events as idempotent for uploaded final image", async () => {
    const prisma = makePrismaMock();
    prisma.asset.findUnique.mockResolvedValue({
      id: "asset-1",
      userId: "user-1",
      postId: "post-1",
      kind: "FINAL_IMAGE",
      s3Key: "users/user-1/posts/post-1/final.fits",
      status: "UPLOADED",
      checksum: "abc123",
      sizeBytes: 500n,
      updatedAt: new Date("2026-03-08T12:01:00.000Z"),
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await uploads.completeUpload(
      "user-1",
      "asset-1",
      999n,
      "different-checksum"
    );

    expect(result?.status).toBe("UPLOADED");
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });
});
