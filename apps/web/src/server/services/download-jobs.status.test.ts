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

function makeReadyJob(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-03-08T00:00:00.000Z");
  return {
    id: "job-1",
    userId: "user-1",
    integrationSetId: "set-1",
    status: "READY",
    selectedPathsJson: ["lights"],
    totalFiles: 4,
    completedFiles: 4,
    lastProgressAt: now,
    outputS3Key: "users/user-1/exports/integration-sets/set-1/job-1.zip",
    outputSizeBytes: 1024n,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ...overrides,
  };
}

describe("getDownloadJobStatusForOwner", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
    vi.mocked(s3.createPresignedDownloadUrl).mockReset();
    vi.mocked(s3.getS3Bucket).mockReset();
    vi.mocked(s3.getS3Bucket).mockReturnValue("artifacts-bucket");
  });

  it("creates a fresh presigned URL each time READY status is requested", async () => {
    const prisma = {
      downloadJob: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(makeReadyJob())
          .mockResolvedValueOnce(makeReadyJob()),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(s3.createPresignedDownloadUrl)
      .mockResolvedValueOnce("https://example.com/dl-1")
      .mockResolvedValueOnce("https://example.com/dl-2");

    const first = await downloadJobsService.getDownloadJobStatusForOwner(
      "set-1",
      "job-1",
      "user-1"
    );
    const second = await downloadJobsService.getDownloadJobStatusForOwner(
      "set-1",
      "job-1",
      "user-1"
    );

    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.job.downloadUrl).toBe("https://example.com/dl-1");

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.job.downloadUrl).toBe("https://example.com/dl-2");

    expect(s3.createPresignedDownloadUrl).toHaveBeenCalledTimes(2);
  });

  it("marks expired READY exports and skips presign generation", async () => {
    const prisma = {
      downloadJob: {
        findUnique: vi.fn().mockResolvedValue(
          makeReadyJob({
            expiresAt: new Date(Date.now() - 5 * 60 * 1000),
          })
        ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await downloadJobsService.getDownloadJobStatusForOwner(
      "set-1",
      "job-1",
      "user-1"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.isExpired).toBe(true);
    expect(result.job.downloadUrl).toBeUndefined();
    expect(s3.createPresignedDownloadUrl).not.toHaveBeenCalled();
  });
});

describe("applyDownloadJobCallback", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("ignores callbacks for cancelled jobs", async () => {
    const prisma = {
      downloadJob: {
        findUnique: vi.fn().mockResolvedValue({
          id: "job-1",
          status: "CANCELLED",
        }),
        updateMany: vi.fn(),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const result = await downloadJobsService.applyDownloadJobCallback("job-1", {
      status: "RUNNING",
      completedFiles: 3,
      totalFiles: 10,
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.downloadJob.updateMany).not.toHaveBeenCalled();
  });
});
