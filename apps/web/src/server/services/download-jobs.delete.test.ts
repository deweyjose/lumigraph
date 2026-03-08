import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("./s3", () => ({
  createPresignedDownloadUrl: vi.fn(),
  deleteS3Object: vi.fn(),
  getS3Bucket: vi.fn(() => "artifacts-bucket"),
}));

const { getPrisma } = await import("@lumigraph/db");
const s3 = await import("./s3");
const downloadJobsService = await import("./download-jobs");

function makePrismaMock() {
  return {
    downloadJob: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe("deleteDownloadJobForOwner", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
    vi.mocked(s3.deleteS3Object).mockReset();
    vi.mocked(s3.getS3Bucket).mockReset();
    vi.mocked(s3.getS3Bucket).mockReturnValue("artifacts-bucket");
  });

  it("deletes a terminal job and its export object", async () => {
    const prisma = makePrismaMock();
    prisma.downloadJob.findUnique.mockResolvedValueOnce({
      id: "job-1",
      userId: "user-1",
      integrationSetId: "set-1",
      status: "READY",
      outputS3Key: "users/user-1/exports/integration-sets/set-1/job-1.zip",
    });
    prisma.downloadJob.deleteMany.mockResolvedValueOnce({ count: 1 });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await downloadJobsService.deleteDownloadJobForOwner(
      "set-1",
      "job-1",
      "user-1"
    );

    expect(result).toEqual({ ok: true });
    expect(s3.deleteS3Object).toHaveBeenCalledWith(
      "artifacts-bucket",
      "users/user-1/exports/integration-sets/set-1/job-1.zip"
    );
    expect(prisma.downloadJob.deleteMany).toHaveBeenCalledWith({
      where: {
        id: "job-1",
        userId: "user-1",
        integrationSetId: "set-1",
        status: { in: ["READY", "FAILED", "CANCELLED"] },
      },
    });
  });

  it("rejects deletion for non-terminal jobs", async () => {
    const prisma = makePrismaMock();
    prisma.downloadJob.findUnique.mockResolvedValueOnce({
      id: "job-2",
      userId: "user-1",
      integrationSetId: "set-1",
      status: "RUNNING",
      outputS3Key: "users/user-1/exports/integration-sets/set-1/job-2.zip",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await downloadJobsService.deleteDownloadJobForOwner(
      "set-1",
      "job-2",
      "user-1"
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("INVALID_STATE");
    expect(s3.deleteS3Object).not.toHaveBeenCalled();
    expect(prisma.downloadJob.deleteMany).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when job is missing", async () => {
    const prisma = makePrismaMock();
    prisma.downloadJob.findUnique.mockResolvedValueOnce(null);
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await downloadJobsService.deleteDownloadJobForOwner(
      "set-1",
      "missing-job",
      "user-1"
    );

    expect(result).toEqual({
      ok: false,
      code: "NOT_FOUND",
      message: "Download job not found",
    });
  });

  it("returns STORAGE_ERROR when S3 deletion fails", async () => {
    const prisma = makePrismaMock();
    prisma.downloadJob.findUnique.mockResolvedValueOnce({
      id: "job-3",
      userId: "user-1",
      integrationSetId: "set-1",
      status: "READY",
      outputS3Key: "users/user-1/exports/integration-sets/set-1/job-3.zip",
    });
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(s3.deleteS3Object).mockRejectedValueOnce(new Error("boom"));

    const result = await downloadJobsService.deleteDownloadJobForOwner(
      "set-1",
      "job-3",
      "user-1"
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("STORAGE_ERROR");
    expect(prisma.downloadJob.deleteMany).not.toHaveBeenCalled();
  });
});
