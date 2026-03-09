import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("./auto-thumb-jobs", () => ({
  enqueueAutoThumbJobForUploadedFinalImage: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");
const autoThumbJobs = await import("./auto-thumb-jobs");
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
    vi.mocked(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).mockReset();
    vi.mocked(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).mockResolvedValue({
      created: true,
      job: {
        id: "job-1",
        status: "PENDING",
        attempts: 0,
        sourceObjectKey: "users/user-1/posts/post-1/final.fits",
        sourceChecksum: "abc123",
        sourceVersion: "checksum:abc123",
        idempotencyKey: "key-1",
        outputThumbKey: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: "2026-03-08T12:00:00.000Z",
        updatedAt: "2026-03-08T12:00:00.000Z",
      },
    });
  });

  it("queues auto-thumb job after final image upload completes", async () => {
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
    expect(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).toHaveBeenCalledWith(
      {
        userId: "user-1",
        postId: "post-1",
        sourceAssetId: "asset-1",
        sourceObjectKey: "users/user-1/posts/post-1/final.fits",
        sourceChecksum: "abc123",
        sourceUpdatedAt: new Date("2026-03-08T12:01:00.000Z"),
      },
      { prisma }
    );
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
    expect(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).toHaveBeenCalledOnce();
  });
});
