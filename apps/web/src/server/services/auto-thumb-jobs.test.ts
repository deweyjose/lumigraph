import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");
const autoThumbJobs = await import("./auto-thumb-jobs");

function makePrismaMock() {
  return {
    autoThumbJob: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
}

function makeJob(
  overrides: Partial<{
    id: string;
    status: "PENDING" | "RUNNING" | "READY" | "FAILED";
    attempts: number;
    sourceObjectKey: string;
    sourceChecksum: string | null;
    sourceVersion: string;
    idempotencyKey: string;
    outputThumbKey: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {}
) {
  return {
    id: overrides.id ?? "job-1",
    status: overrides.status ?? "PENDING",
    attempts: overrides.attempts ?? 0,
    sourceObjectKey:
      overrides.sourceObjectKey ?? "users/u1/posts/p1/final.fits",
    sourceChecksum: overrides.sourceChecksum ?? "abc123",
    sourceVersion: overrides.sourceVersion ?? "checksum:abc123",
    idempotencyKey: overrides.idempotencyKey ?? "key-1",
    outputThumbKey: overrides.outputThumbKey ?? null,
    errorMessage: overrides.errorMessage ?? null,
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-03-08T12:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-03-08T12:00:00.000Z"),
  };
}

describe("auto-thumb-jobs service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.mocked(getPrisma).mockReset();
  });

  it("builds checksum source version when checksum is present", () => {
    const version = autoThumbJobs.buildAutoThumbSourceVersion({
      sourceAssetId: "asset-1",
      sourceChecksum: " sha256:abc ",
      sourceUpdatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });
    expect(version).toBe("checksum:sha256:abc");
  });

  it("builds deterministic idempotency key", () => {
    const key = autoThumbJobs.buildAutoThumbIdempotencyKey(
      "post-1",
      "checksum:abc123"
    );
    expect(key).toHaveLength(64);
    expect(key).toBe(
      autoThumbJobs.buildAutoThumbIdempotencyKey("post-1", "checksum:abc123")
    );
  });

  it("uses AUTO_THUMB_MAX_ATTEMPTS when configured", () => {
    process.env.AUTO_THUMB_MAX_ATTEMPTS = "7";
    expect(autoThumbJobs.getAutoThumbMaxAttempts()).toBe(7);
  });

  it("creates a pending job for a newly uploaded final image", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.findUnique.mockResolvedValue(null);
    prisma.autoThumbJob.create.mockResolvedValue(
      makeJob({
        id: "job-new",
        idempotencyKey: autoThumbJobs.buildAutoThumbIdempotencyKey(
          "post-1",
          "checksum:abc123"
        ),
      })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage({
      userId: "user-1",
      postId: "post-1",
      sourceAssetId: "asset-1",
      sourceObjectKey: "users/user-1/posts/post-1/final.fits",
      sourceChecksum: "abc123",
      sourceUpdatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });

    expect(out.created).toBe(true);
    expect(out.job.status).toBe("PENDING");
    expect(prisma.autoThumbJob.create).toHaveBeenCalledOnce();
  });

  it("does not create a duplicate effective job for duplicate enqueue events", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.findUnique.mockResolvedValue(
      makeJob({
        id: "job-existing",
        status: "RUNNING",
      })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage({
      userId: "user-1",
      postId: "post-1",
      sourceAssetId: "asset-1",
      sourceObjectKey: "users/user-1/posts/post-1/final.fits",
      sourceChecksum: "abc123",
      sourceUpdatedAt: new Date("2026-03-08T12:00:00.000Z"),
    });

    expect(out.created).toBe(false);
    expect(out.job.id).toBe("job-existing");
    expect(prisma.autoThumbJob.create).not.toHaveBeenCalled();
  });

  it("requeues a failed job when duplicate enqueue arrives", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.findUnique.mockResolvedValue(
      makeJob({
        id: "job-failed",
        status: "FAILED",
        errorMessage: "boom",
        completedAt: new Date("2026-03-08T12:05:00.000Z"),
      })
    );
    prisma.autoThumbJob.update.mockResolvedValue(
      makeJob({
        id: "job-failed",
        status: "PENDING",
        errorMessage: null,
        completedAt: null,
      })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage({
      userId: "user-1",
      postId: "post-1",
      sourceAssetId: "asset-1",
      sourceObjectKey: "users/user-1/posts/post-1/final.fits",
      sourceChecksum: "abc123",
      sourceUpdatedAt: new Date("2026-03-08T12:10:00.000Z"),
    });

    expect(out.created).toBe(false);
    expect(out.job.status).toBe("PENDING");
    expect(prisma.autoThumbJob.update).toHaveBeenCalledOnce();
  });

  it("transitions pending -> running and increments attempts", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.autoThumbJob.findUniqueOrThrow.mockResolvedValue(
      makeJob({
        id: "job-running",
        status: "RUNNING",
        attempts: 1,
        startedAt: new Date("2026-03-08T12:01:00.000Z"),
      })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.markAutoThumbJobRunning("job-running");

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.job.status).toBe("RUNNING");
    expect(out.job.attempts).toBe(1);
  });

  it("rejects ready transition from non-running status", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.updateMany.mockResolvedValue({ count: 0 });
    prisma.autoThumbJob.findUnique.mockResolvedValue(
      makeJob({ id: "job-failed", status: "FAILED" })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.markAutoThumbJobReady(
      "job-failed",
      "users/u1/thumbs/p1/job-failed.webp"
    );

    expect(out).toEqual({
      ok: false,
      code: "INVALID_STATE",
      message: "Auto-thumb job cannot transition from status FAILED.",
    });
  });

  it("requeues running job to pending with error detail", async () => {
    const prisma = makePrismaMock();
    prisma.autoThumbJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.autoThumbJob.findUniqueOrThrow.mockResolvedValue(
      makeJob({
        id: "job-1",
        status: "PENDING",
        attempts: 2,
        errorMessage: "temporary processing failure",
        startedAt: null,
      })
    );
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);

    const out = await autoThumbJobs.markAutoThumbJobRetryPending(
      "job-1",
      "temporary processing failure"
    );

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.job.status).toBe("PENDING");
    expect(out.job.errorMessage).toContain("temporary processing failure");
    expect(prisma.autoThumbJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job-1", status: "RUNNING" },
      data: {
        status: "PENDING",
        errorMessage: "temporary processing failure",
        startedAt: null,
        completedAt: null,
        outputThumbKey: null,
      },
    });
  });
});
