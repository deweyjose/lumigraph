import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const InvokeCommandMock = vi.fn((input: unknown) => ({ input }));
const LambdaClientMock = vi.fn(() => ({ send: sendMock }));

vi.mock("@aws-sdk/client-lambda", () => ({
  InvokeCommand: InvokeCommandMock,
  LambdaClient: LambdaClientMock,
}));

vi.mock("./auto-thumb-jobs", () => ({
  getAutoThumbJobRuntimeRecord: vi.fn(),
  getAutoThumbMaxAttempts: vi.fn(() => 3),
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
const runtime = await import("./auto-thumb-runtime");

type RuntimeJob = {
  id: string;
  userId: string;
  postId: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED";
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
    vi.mocked(autoThumbJobs.getAutoThumbMaxAttempts).mockReset();
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
});
