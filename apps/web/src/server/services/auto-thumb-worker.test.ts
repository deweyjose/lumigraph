import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("./auto-thumb-jobs", () => ({
  getAutoThumbMaxAttempts: vi.fn(() => 5),
  listPendingAutoThumbJobs: vi.fn(),
  markAutoThumbJobFailed: vi.fn(),
  markAutoThumbJobReady: vi.fn(),
  markAutoThumbJobRetryPending: vi.fn(),
  markAutoThumbJobRunning: vi.fn(),
}));

vi.mock("./s3", () => ({
  getS3Bucket: vi.fn(() => "artifacts-bucket"),
  getS3Client: vi.fn(),
  imageAutoThumbKey: vi.fn(
    (userId: string, postId: string, jobId: string) =>
      `users/${userId}/posts/${postId}/final/thumbs/${jobId}.webp`
  ),
}));

const { getPrisma } = await import("@lumigraph/db");
const autoThumbJobs = await import("./auto-thumb-jobs");
const worker = await import("./auto-thumb-worker");

function makeWorkerJob(
  overrides: Partial<{
    id: string;
    userId: string;
    postId: string;
    status: "PENDING" | "RUNNING" | "READY" | "FAILED";
    attempts: number;
    sourceObjectKey: string;
    outputThumbKey: string | null;
  }> = {}
) {
  return {
    id: overrides.id ?? "job-1",
    userId: overrides.userId ?? "user-1",
    postId: overrides.postId ?? "post-1",
    status: overrides.status ?? "PENDING",
    attempts: overrides.attempts ?? 0,
    sourceObjectKey:
      overrides.sourceObjectKey ?? "users/user-1/posts/post-1/final/main.png",
    outputThumbKey: overrides.outputThumbKey ?? null,
  };
}

describe("auto-thumb-worker service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes a claimed job and marks it READY with deterministic output key", async () => {
    const prisma = {
      autoThumbJob: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(makeWorkerJob({ status: "PENDING" }))
          .mockResolvedValueOnce(
            makeWorkerJob({ status: "RUNNING", attempts: 1 })
          ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobReady).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);

    const readObject = vi.fn().mockResolvedValue(Buffer.from("source"));
    const createThumbnail = vi.fn().mockResolvedValue(Buffer.from("thumb"));
    const writeObject = vi.fn().mockResolvedValue(undefined);

    const out = await worker.processAutoThumbJob("job-1", {
      dependencies: { readObject, writeObject, createThumbnail },
      maxAttempts: 5,
    });

    expect(out).toEqual({
      ok: true,
      jobId: "job-1",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
      processed: true,
      attempts: 1,
    });
    expect(readObject).toHaveBeenCalledWith(
      "artifacts-bucket",
      "users/user-1/posts/post-1/final/main.png"
    );
    expect(writeObject).toHaveBeenCalledWith(
      "artifacts-bucket",
      "users/user-1/posts/post-1/final/thumbs/job-1.webp",
      Buffer.from("thumb"),
      "image/webp"
    );
    expect(autoThumbJobs.markAutoThumbJobReady).toHaveBeenCalledWith(
      "job-1",
      "users/user-1/posts/post-1/final/thumbs/job-1.webp"
    );
  });

  it("is idempotent when a job is already READY", async () => {
    const prisma = {
      autoThumbJob: {
        findUnique: vi.fn().mockResolvedValue(
          makeWorkerJob({
            status: "READY",
            attempts: 1,
            outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
          })
        ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await worker.processAutoThumbJob("job-1");

    expect(out).toEqual({
      ok: true,
      jobId: "job-1",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
      processed: false,
      attempts: 1,
    });
    expect(autoThumbJobs.markAutoThumbJobRunning).not.toHaveBeenCalled();
  });

  it("requeues retryable failures when attempts are below max", async () => {
    const prisma = {
      autoThumbJob: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(makeWorkerJob({ status: "PENDING" }))
          .mockResolvedValueOnce(
            makeWorkerJob({ status: "RUNNING", attempts: 1 })
          ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRetryPending).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);

    const out = await worker.processAutoThumbJob("job-1", {
      dependencies: {
        readObject: vi.fn().mockRejectedValue(new Error("decode failed")),
        writeObject: vi.fn(),
        createThumbnail: vi.fn(),
      },
      maxAttempts: 3,
    });

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.code).toBe("RETRY_SCHEDULED");
    expect(autoThumbJobs.markAutoThumbJobRetryPending).toHaveBeenCalledWith(
      "job-1",
      "decode failed"
    );
    expect(autoThumbJobs.markAutoThumbJobFailed).not.toHaveBeenCalled();
  });

  it("marks failures terminal when attempts hit max", async () => {
    const prisma = {
      autoThumbJob: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(makeWorkerJob({ status: "PENDING" }))
          .mockResolvedValueOnce(
            makeWorkerJob({ status: "RUNNING", attempts: 3 })
          ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 3 },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobFailed).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 3 },
    } as never);

    const out = await worker.processAutoThumbJob("job-1", {
      dependencies: {
        readObject: vi.fn().mockRejectedValue(new Error("invalid image data")),
        writeObject: vi.fn(),
        createThumbnail: vi.fn(),
      },
      maxAttempts: 3,
    });

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.code).toBe("FAILED");
    expect(autoThumbJobs.markAutoThumbJobFailed).toHaveBeenCalledWith(
      "job-1",
      "invalid image data"
    );
    expect(autoThumbJobs.markAutoThumbJobRetryPending).not.toHaveBeenCalled();
  });

  it("runs worker batches from pending jobs and returns summary counts", async () => {
    vi.mocked(autoThumbJobs.listPendingAutoThumbJobs).mockResolvedValue([
      { id: "job-1", status: "PENDING" },
    ] as never);

    const prisma = {
      autoThumbJob: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(makeWorkerJob({ id: "job-1" }))
          .mockResolvedValueOnce(
            makeWorkerJob({ id: "job-1", status: "RUNNING", attempts: 1 })
          ),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobReady).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);

    const out = await worker.runAutoThumbWorkerBatch({
      limit: 1,
      dependencies: {
        readObject: vi.fn().mockResolvedValue(Buffer.from("source")),
        writeObject: vi.fn().mockResolvedValue(undefined),
        createThumbnail: vi.fn().mockResolvedValue(Buffer.from("thumb")),
      },
    });

    expect(out.requested).toBe(1);
    expect(out.processed).toBe(1);
    expect(out.failed).toBe(0);
    expect(out.retryScheduled).toBe(0);
    expect(out.skipped).toBe(0);
  });
});
