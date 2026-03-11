import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const InvokeCommandMock = vi.fn((input: unknown) => ({ input }));
const LambdaClientMock = vi.fn(() => ({ send: sendMock }));

vi.mock("@aws-sdk/client-lambda", () => ({
  InvokeCommand: InvokeCommandMock,
  LambdaClient: LambdaClientMock,
}));

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("./auto-thumb-jobs", () => ({
  cancelAutoThumbJobForOwner: vi.fn(),
  enqueueAutoThumbJobForUploadedFinalImage: vi.fn(),
  getAutoThumbJobRuntimeRecord: vi.fn(),
  getAutoThumbMaxAttempts: vi.fn(() => 3),
  getLatestAutoThumbJobForPostOwner: vi.fn(),
  markAutoThumbJobFailed: vi.fn(),
  markAutoThumbJobReady: vi.fn(),
  markAutoThumbJobRetryPending: vi.fn(),
  markAutoThumbJobRunning: vi.fn(),
}));

vi.mock("./s3", () => ({
  getS3Bucket: vi.fn(() => "artifacts-bucket"),
  imageAutoThumbKey: vi.fn(
    (userId: string, postId: string, jobId: string) =>
      `users/${userId}/posts/${postId}/final/thumbs/${jobId}.webp`
  ),
}));

const autoThumbJobs = await import("./auto-thumb-jobs");
const { getPrisma } = await import("@lumigraph/db");
const runtime = await import("./auto-thumb-runtime");

type RuntimeJob = {
  id: string;
  userId: string;
  postId: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED" | "CANCELLED";
  attempts: number;
  sourceObjectKey: string;
};

function makeRuntimeJob(overrides: Partial<RuntimeJob> = {}): RuntimeJob {
  return {
    id: overrides.id ?? "job-1",
    userId: overrides.userId ?? "user-1",
    postId: overrides.postId ?? "post-1",
    status: overrides.status ?? "PENDING",
    attempts: overrides.attempts ?? 0,
    sourceObjectKey:
      overrides.sourceObjectKey ?? "users/user-1/posts/post-1/final/main.png",
  };
}

function decodeInvokePayload(index = 0): Record<string, unknown> {
  const command = sendMock.mock.calls[index]?.[0] as {
    input?: { Payload?: Buffer | Uint8Array | string };
  };
  const raw = command.input?.Payload;
  if (!raw) return {};
  if (typeof raw === "string") return JSON.parse(raw);
  return JSON.parse(Buffer.from(raw).toString("utf8"));
}

describe("auto-thumb-runtime service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AWS_REGION: "us-east-1",
      AUTO_THUMB_LAMBDA_NAME: "lumigraph-auto-thumb-local",
      INTERNAL_CALLBACK_SECRET: "callback-secret",
      AUTO_THUMB_MAX_WIDTH: "1024",
      AUTO_THUMB_MAX_HEIGHT: "1024",
      AUTO_THUMB_WEBP_QUALITY: "82",
    };

    sendMock.mockReset();
    sendMock.mockResolvedValue({});
    InvokeCommandMock.mockClear();
    LambdaClientMock.mockClear();

    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockReset();
    vi.mocked(autoThumbJobs.cancelAutoThumbJobForOwner).mockReset();
    vi.mocked(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).mockReset();
    vi.mocked(autoThumbJobs.getAutoThumbMaxAttempts).mockReset();
    vi.mocked(autoThumbJobs.getLatestAutoThumbJobForPostOwner).mockReset();
    vi.mocked(autoThumbJobs.getAutoThumbMaxAttempts).mockReturnValue(3);
    vi.mocked(autoThumbJobs.markAutoThumbJobFailed).mockReset();
    vi.mocked(autoThumbJobs.markAutoThumbJobReady).mockReset();
    vi.mocked(autoThumbJobs.markAutoThumbJobRetryPending).mockReset();
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockReset();
    vi.mocked(autoThumbJobs.markAutoThumbJobFailed).mockResolvedValue({
      ok: true,
      job: { id: "job-1" },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobReady).mockResolvedValue({
      ok: true,
      job: { id: "job-1" },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRetryPending).mockResolvedValue({
      ok: true,
      job: { id: "job-1" },
    } as never);
    vi.mocked(autoThumbJobs.markAutoThumbJobRunning).mockResolvedValue({
      ok: true,
      job: { id: "job-1", attempts: 1 },
    } as never);
    vi.mocked(autoThumbJobs.cancelAutoThumbJobForOwner).mockResolvedValue({
      ok: true,
      job: { id: "job-1", status: "CANCELLED" },
    } as never);
    vi.mocked(getPrisma).mockReset();
  });

  it("dispatches pending jobs to Lambda with deterministic callback and output key", async () => {
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "PENDING" }) as never
    );

    const result = await runtime.dispatchAutoThumbJob("job-1", {
      requestOrigin: "http://localhost:3000",
    });

    expect(result).toEqual({ ok: true, invoked: true });
    expect(sendMock).toHaveBeenCalledOnce();

    const payload = decodeInvokePayload();
    expect(payload).toMatchObject({
      jobId: "job-1",
      userId: "user-1",
      postId: "post-1",
      bucket: "artifacts-bucket",
      sourceObjectKey: "users/user-1/posts/post-1/final/main.png",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
      callbackUrl:
        "http://localhost:3000/api/internal/auto-thumb-jobs/job-1/callback",
    });
  });

  it("marks a pending job failed when callback secret is missing", async () => {
    delete process.env.INTERNAL_CALLBACK_SECRET;
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "PENDING" }) as never
    );

    const result = await runtime.dispatchAutoThumbJob("job-1", {
      requestOrigin: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("INTERNAL_CALLBACK_SECRET");
    expect(autoThumbJobs.markAutoThumbJobFailed).toHaveBeenCalledOnce();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("retries failed callbacks below max attempts by re-dispatching the job", async () => {
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord)
      .mockResolvedValueOnce(
        makeRuntimeJob({ status: "RUNNING", attempts: 1 }) as never
      )
      .mockResolvedValueOnce(
        makeRuntimeJob({ status: "PENDING", attempts: 1 }) as never
      );

    const result = await runtime.applyAutoThumbJobCallback(
      "job-1",
      {
        status: "FAILED",
        errorMessage: "decode failed",
      },
      {
        requestOrigin: "http://localhost:3000",
      }
    );

    expect(result).toEqual({ ok: true });
    expect(autoThumbJobs.markAutoThumbJobRetryPending).toHaveBeenCalledWith(
      "job-1",
      "decode failed"
    );
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("marks failed callbacks terminal when attempts hit max", async () => {
    vi.mocked(autoThumbJobs.getAutoThumbMaxAttempts).mockReturnValue(3);
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "RUNNING", attempts: 3 }) as never
    );

    const result = await runtime.applyAutoThumbJobCallback("job-1", {
      status: "FAILED",
      errorMessage: "hard failure",
    });

    expect(result).toEqual({ ok: true });
    expect(autoThumbJobs.markAutoThumbJobFailed).toHaveBeenCalledWith(
      "job-1",
      "hard failure"
    );
    expect(autoThumbJobs.markAutoThumbJobRetryPending).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects READY callbacks with mismatched output keys", async () => {
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "RUNNING" }) as never
    );

    const result = await runtime.applyAutoThumbJobCallback("job-1", {
      status: "READY",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/other.webp",
    });

    expect(result).toEqual({
      ok: false,
      message: "outputThumbKey does not match expected auto-thumb key",
    });
    expect(autoThumbJobs.markAutoThumbJobReady).not.toHaveBeenCalled();
  });

  it("ignores callbacks for cancelled jobs", async () => {
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "CANCELLED" }) as never
    );

    const result = await runtime.applyAutoThumbJobCallback("job-1", {
      status: "READY",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
    });

    expect(result).toEqual({ ok: true });
    expect(autoThumbJobs.markAutoThumbJobReady).not.toHaveBeenCalled();
  });

  it("attaches a generated thumb asset when READY callback succeeds", async () => {
    const prisma = {
      autoThumbJob: {
        findUnique: vi.fn().mockResolvedValue({
          id: "job-1",
          userId: "user-1",
          postId: "post-1",
        }),
      },
      asset: {
        create: vi.fn().mockResolvedValue({ id: "asset-thumb-1" }),
      },
      post: {
        update: vi.fn().mockResolvedValue({ id: "post-1" }),
      },
    };
    vi.mocked(getPrisma).mockResolvedValue(prisma as never);
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "RUNNING" }) as never
    );

    const result = await runtime.applyAutoThumbJobCallback("job-1", {
      status: "READY",
      outputThumbKey: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
    });

    expect(result).toEqual({ ok: true });
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        postId: "post-1",
        kind: "FINAL_THUMB",
        filename: "job-1.webp",
        contentType: "image/webp",
        s3Key: "users/user-1/posts/post-1/final/thumbs/job-1.webp",
        status: "UPLOADED",
      }),
    });
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { finalThumbAssetId: "asset-thumb-1" },
    });
  });

  it("verifies callback signatures and rejects stale timestamps", () => {
    const secret = "test-secret";
    const freshTimestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ status: "RUNNING" });

    const signature = runtime.buildAutoThumbJobCallbackSignature(
      secret,
      freshTimestamp,
      body
    );

    expect(
      runtime.verifyAutoThumbJobCallbackSignature(
        secret,
        freshTimestamp,
        signature,
        body
      )
    ).toBe(true);

    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 10_000);
    const staleSignature = runtime.buildAutoThumbJobCallbackSignature(
      secret,
      staleTimestamp,
      body
    );

    expect(
      runtime.verifyAutoThumbJobCallbackSignature(
        secret,
        staleTimestamp,
        staleSignature,
        body
      )
    ).toBe(false);
  });

  it("triggers a manual auto-thumb job for an owned post", async () => {
    vi.mocked(getPrisma).mockResolvedValue({
      post: {
        findUnique: vi.fn().mockResolvedValue({
          id: "post-1",
          userId: "user-1",
          finalImageAsset: {
            id: "asset-1",
            userId: "user-1",
            postId: "post-1",
            status: "UPLOADED",
            s3Key: "users/user-1/posts/post-1/final/main.png",
            checksum: "abc123",
            updatedAt: new Date("2026-03-10T12:00:00.000Z"),
          },
        }),
      },
    } as never);
    vi.mocked(
      autoThumbJobs.enqueueAutoThumbJobForUploadedFinalImage
    ).mockResolvedValue({
      created: false,
      job: {
        id: "job-1",
        status: "PENDING",
        attempts: 0,
        sourceObjectKey: "users/user-1/posts/post-1/final/main.png",
        sourceChecksum: "abc123",
        sourceVersion: "checksum:abc123",
        idempotencyKey: "key-1",
        outputThumbKey: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: "2026-03-10T12:00:00.000Z",
        updatedAt: "2026-03-10T12:00:00.000Z",
      },
    } as never);
    vi.mocked(
      autoThumbJobs.getLatestAutoThumbJobForPostOwner
    ).mockResolvedValue({
      id: "job-1",
      status: "PENDING",
      attempts: 0,
      sourceObjectKey: "users/user-1/posts/post-1/final/main.png",
      sourceChecksum: "abc123",
      sourceVersion: "checksum:abc123",
      idempotencyKey: "key-1",
      outputThumbKey: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: "2026-03-10T12:00:00.000Z",
      updatedAt: "2026-03-10T12:00:00.000Z",
    } as never);
    vi.mocked(autoThumbJobs.getAutoThumbJobRuntimeRecord).mockResolvedValue(
      makeRuntimeJob({ status: "PENDING" }) as never
    );

    const result = await runtime.triggerAutoThumbForPostOwner(
      "user-1",
      "post-1",
      { requestOrigin: "http://localhost:3000" }
    );

    expect(result).toEqual({
      ok: true,
      invoked: true,
      job: expect.objectContaining({
        id: "job-1",
        status: "PENDING",
      }),
    });
  });

  it("cancels the latest job for an owned post", async () => {
    vi.mocked(
      autoThumbJobs.getLatestAutoThumbJobForPostOwner
    ).mockResolvedValue({
      id: "job-1",
      status: "RUNNING",
      attempts: 1,
      sourceObjectKey: "users/user-1/posts/post-1/final/main.png",
      sourceChecksum: "abc123",
      sourceVersion: "checksum:abc123",
      idempotencyKey: "key-1",
      outputThumbKey: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: "2026-03-10T12:00:00.000Z",
      updatedAt: "2026-03-10T12:00:00.000Z",
    } as never);

    const result = await runtime.cancelAutoThumbForPostOwner(
      "user-1",
      "post-1"
    );

    expect(result).toEqual({
      ok: true,
      job: expect.objectContaining({
        id: "job-1",
        status: "CANCELLED",
      }),
    });
    expect(autoThumbJobs.cancelAutoThumbJobForOwner).toHaveBeenCalledWith(
      "user-1",
      "post-1",
      "job-1"
    );
  });
});
