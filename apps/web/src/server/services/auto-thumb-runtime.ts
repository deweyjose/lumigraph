import { createHmac, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@lumigraph/db";
import {
  type InvokeCommandInput,
  InvokeCommand,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import {
  cancelAutoThumbJobForOwner,
  enqueueAutoThumbJobForUploadedFinalImage,
  getAutoThumbJobRuntimeRecord,
  getAutoThumbMaxAttempts,
  getLatestAutoThumbJobForPostOwner,
  markAutoThumbJobFailed,
  markAutoThumbJobReady,
  markAutoThumbJobRetryPending,
  markAutoThumbJobRunning,
  type AutoThumbJobView,
} from "./auto-thumb-jobs";
import { resolveCallbackBaseUrl } from "./local-dev-callback-origin";
import { getS3Bucket, imageAutoThumbKey } from "./s3";

const CALLBACK_TTL_SECONDS = 300;
const DEFAULT_MAX_WIDTH = 1024;
const DEFAULT_MAX_HEIGHT = 1024;
const DEFAULT_WEBP_QUALITY = 82;

type AutoThumbCallbackPayload =
  | {
      status: "RUNNING";
    }
  | {
      status: "FAILED";
      errorMessage?: string;
    }
  | {
      status: "READY";
      outputThumbKey: string;
    };

export type DispatchAutoThumbJobResult =
  | {
      ok: true;
      invoked: boolean;
    }
  | {
      ok: false;
      message: string;
    };

export type ApplyAutoThumbJobCallbackResult =
  | { ok: true }
  | { ok: false; message: string };

export type TriggerAutoThumbForPostOwnerResult =
  | { ok: true; job: AutoThumbJobView; invoked: boolean }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "NO_FINAL_IMAGE"
        | "INVALID_SOURCE"
        | "DISPATCH_FAILED";
      message: string;
    };

export type CancelAutoThumbForPostOwnerResult =
  | { ok: true; job: AutoThumbJobView }
  | {
      ok: false;
      code: "NOT_FOUND" | "INVALID_STATE";
      message: string;
    };

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getAutoThumbMaxWidth(): number {
  return parsePositiveInt(process.env.AUTO_THUMB_MAX_WIDTH, DEFAULT_MAX_WIDTH);
}

function getAutoThumbMaxHeight(): number {
  return parsePositiveInt(
    process.env.AUTO_THUMB_MAX_HEIGHT,
    DEFAULT_MAX_HEIGHT
  );
}

function getAutoThumbWebpQuality(): number {
  const quality = parsePositiveInt(
    process.env.AUTO_THUMB_WEBP_QUALITY,
    DEFAULT_WEBP_QUALITY
  );
  return Math.min(100, Math.max(1, quality));
}

async function getLambdaClient(): Promise<LambdaClient> {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const endpoint = process.env.AWS_LAMBDA_ENDPOINT;
  const usingCustomEndpoint =
    typeof endpoint === "string" && endpoint.length > 0;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const config: LambdaClientConfig = {
    region,
    ...(usingCustomEndpoint && { endpoint }),
    ...(usingCustomEndpoint && {
      credentials: {
        accessKeyId:
          accessKeyId && accessKeyId.length > 0 ? accessKeyId : "test",
        secretAccessKey:
          secretAccessKey && secretAccessKey.length > 0
            ? secretAccessKey
            : "test",
        ...(sessionToken && sessionToken.length > 0 && { sessionToken }),
      },
    }),
  };

  if (process.env.VERCEL && process.env.AWS_ROLE_ARN && !usingCustomEndpoint) {
    const { awsCredentialsProvider } = await import(
      "@vercel/oidc-aws-credentials-provider"
    );
    return new LambdaClient({
      ...config,
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN,
      }),
    } as LambdaClientConfig);
  }

  return new LambdaClient(config);
}

async function invokeAutoThumbLambda(payload: object): Promise<void> {
  const lambdaName = process.env.AUTO_THUMB_LAMBDA_NAME;
  if (!lambdaName) {
    throw new Error("AUTO_THUMB_LAMBDA_NAME is not set");
  }

  const client = await getLambdaClient();
  const input: InvokeCommandInput = {
    FunctionName: lambdaName,
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify(payload)),
  };
  await client.send(new InvokeCommand(input));
}

function formatInvokeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Auto-thumb Lambda invoke failed";
}

async function failPendingAutoThumbJob(jobId: string, message: string) {
  await markAutoThumbJobFailed(jobId, message.slice(0, 1000));
}

export async function triggerAutoThumbForPostOwner(
  userId: string,
  postId: string,
  options?: { requestOrigin?: string }
): Promise<TriggerAutoThumbForPostOwnerResult> {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { finalImageAsset: true },
  });
  if (!post || post.userId !== userId) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Post not found or you do not own it",
    };
  }

  const sourceAsset = post.finalImageAsset;
  if (!sourceAsset) {
    return {
      ok: false,
      code: "NO_FINAL_IMAGE",
      message: "Upload a final image before generating a thumbnail.",
    };
  }

  if (
    sourceAsset.userId !== userId ||
    sourceAsset.postId !== postId ||
    sourceAsset.status !== "UPLOADED"
  ) {
    return {
      ok: false,
      code: "INVALID_SOURCE",
      message: "The current final image is not ready for thumbnail generation.",
    };
  }

  const enqueueResult = await enqueueAutoThumbJobForUploadedFinalImage(
    {
      userId,
      postId,
      sourceAssetId: sourceAsset.id,
      sourceObjectKey: sourceAsset.s3Key,
      sourceChecksum: sourceAsset.checksum,
      sourceUpdatedAt: sourceAsset.updatedAt,
    },
    { prisma, requeueCompleted: true }
  );

  if (enqueueResult.job.status !== "PENDING") {
    return { ok: true, job: enqueueResult.job, invoked: false };
  }

  const dispatched = await dispatchAutoThumbJob(enqueueResult.job.id, {
    requestOrigin: options?.requestOrigin,
  });
  if (!dispatched.ok) {
    const latest = await getLatestAutoThumbJobForPostOwner(userId, postId);
    return {
      ok: false,
      code: "DISPATCH_FAILED",
      message: latest?.errorMessage ?? dispatched.message,
    };
  }

  const latest =
    (await getLatestAutoThumbJobForPostOwner(userId, postId)) ??
    enqueueResult.job;
  return { ok: true, job: latest, invoked: dispatched.invoked };
}

export async function cancelAutoThumbForPostOwner(
  userId: string,
  postId: string
): Promise<CancelAutoThumbForPostOwnerResult> {
  const job = await getLatestAutoThumbJobForPostOwner(userId, postId);
  if (!job) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Auto-thumb job not found",
    };
  }
  return cancelAutoThumbJobForOwner(userId, postId, job.id);
}

export async function dispatchAutoThumbJob(
  jobId: string,
  options?: { requestOrigin?: string }
): Promise<DispatchAutoThumbJobResult> {
  const runtimeJob = await getAutoThumbJobRuntimeRecord(jobId);
  if (!runtimeJob) {
    return { ok: false, message: "Auto-thumb job not found" };
  }

  if (runtimeJob.status !== "PENDING") {
    return { ok: true, invoked: false };
  }

  if (!process.env.INTERNAL_CALLBACK_SECRET) {
    const message =
      "INTERNAL_CALLBACK_SECRET is not configured for auto-thumb jobs.";
    await failPendingAutoThumbJob(runtimeJob.id, message);
    return { ok: false, message };
  }

  const callbackBaseUrl = resolveCallbackBaseUrl(options?.requestOrigin, {
    localDevOverride: process.env.LOCAL_DEV_CALLBACK_URL_OVERRIDE,
  });
  if (!callbackBaseUrl) {
    const message = "Request origin is required for auto-thumb jobs.";
    await failPendingAutoThumbJob(runtimeJob.id, message);
    return { ok: false, message };
  }

  const outputThumbKey = imageAutoThumbKey(
    runtimeJob.userId,
    runtimeJob.postId,
    runtimeJob.id
  );

  try {
    await invokeAutoThumbLambda({
      jobId: runtimeJob.id,
      userId: runtimeJob.userId,
      postId: runtimeJob.postId,
      bucket: getS3Bucket(),
      sourceObjectKey: runtimeJob.sourceObjectKey,
      outputThumbKey,
      maxWidth: getAutoThumbMaxWidth(),
      maxHeight: getAutoThumbMaxHeight(),
      webpQuality: getAutoThumbWebpQuality(),
      callbackUrl: `${callbackBaseUrl}/api/internal/auto-thumb-jobs/${runtimeJob.id}/callback`,
    });
    return { ok: true, invoked: true };
  } catch (err) {
    const message = formatInvokeError(err);
    await failPendingAutoThumbJob(runtimeJob.id, message);
    return { ok: false, message };
  }
}

function toHexHmac(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret.trim())
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

function secureEqualsHex(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function normalizeCallbackSignature(signature: string): string | null {
  const lower = signature.trim().toLowerCase();
  const value = lower.startsWith("sha256=") ? lower.slice(7) : lower;
  if (!/^[a-f0-9]{64}$/.test(value)) return null;
  return value;
}

export function buildAutoThumbJobCallbackSignature(
  secret: string,
  timestamp: string,
  body: string
): string {
  return toHexHmac(secret, timestamp, body);
}

export function verifyAutoThumbJobCallbackSignature(
  secret: string,
  timestamp: string,
  signature: string,
  body: string
): boolean {
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > CALLBACK_TTL_SECONDS) return false;

  const normalizedSig = normalizeCallbackSignature(signature);
  if (!normalizedSig) return false;

  const expected = toHexHmac(secret, timestamp, body).toLowerCase();
  if (secureEqualsHex(expected, normalizedSig)) return true;

  try {
    const canonicalBody = JSON.stringify(JSON.parse(body));
    if (canonicalBody !== body) {
      const canonicalExpected = toHexHmac(secret, timestamp, canonicalBody);
      return secureEqualsHex(canonicalExpected, normalizedSig);
    }
  } catch {
    return false;
  }

  return false;
}

function canIgnoreTransitionFailure(message: string): boolean {
  return message.includes("cannot transition from status");
}

async function attachGeneratedThumbAsset(
  jobId: string,
  outputThumbKey: string
) {
  const prisma = await getPrisma();
  const job = await prisma.autoThumbJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      postId: true,
    },
  });
  if (!job) {
    return { ok: false as const, message: "Auto-thumb job not found" };
  }

  const filename = outputThumbKey.split("/").pop();
  if (!filename) {
    return { ok: false as const, message: "Invalid output thumb key" };
  }

  const asset = await prisma.asset.create({
    data: {
      userId: job.userId,
      postId: job.postId,
      kind: "FINAL_THUMB",
      relativePath: filename,
      filename,
      contentType: "image/webp",
      sizeBytes: 0n,
      s3Key: outputThumbKey,
      status: "UPLOADED",
    },
  });

  await prisma.post.update({
    where: { id: job.postId },
    data: { finalThumbAssetId: asset.id },
  });

  return { ok: true as const };
}

export async function applyAutoThumbJobCallback(
  jobId: string,
  payload: AutoThumbCallbackPayload,
  options?: { requestOrigin?: string }
): Promise<ApplyAutoThumbJobCallbackResult> {
  let job = await getAutoThumbJobRuntimeRecord(jobId);
  if (!job) return { ok: false, message: "Auto-thumb job not found" };

  if (payload.status === "RUNNING") {
    if (
      job.status === "RUNNING" ||
      job.status === "READY" ||
      job.status === "FAILED" ||
      job.status === "CANCELLED"
    ) {
      return { ok: true };
    }

    const running = await markAutoThumbJobRunning(jobId);
    if (running.ok) return { ok: true };
    if (running.code === "INVALID_STATE") return { ok: true };
    return { ok: false, message: running.message };
  }

  if (payload.status === "READY") {
    const expectedOutputKey = imageAutoThumbKey(job.userId, job.postId, job.id);
    if (payload.outputThumbKey !== expectedOutputKey) {
      return {
        ok: false,
        message: "outputThumbKey does not match expected auto-thumb key",
      };
    }

    if (
      job.status === "READY" ||
      job.status === "FAILED" ||
      job.status === "CANCELLED"
    ) {
      return { ok: true };
    }

    if (job.status === "PENDING") {
      const running = await markAutoThumbJobRunning(jobId);
      if (!running.ok && running.code === "NOT_FOUND") {
        return { ok: false, message: running.message };
      }
    }

    const ready = await markAutoThumbJobReady(jobId, payload.outputThumbKey);
    if (ready.ok) {
      const attached = await attachGeneratedThumbAsset(
        jobId,
        payload.outputThumbKey
      );
      if (!attached.ok) {
        return { ok: false, message: attached.message };
      }
      return { ok: true };
    }
    if (ready.code === "INVALID_STATE") return { ok: true };
    return { ok: false, message: ready.message };
  }

  if (
    job.status === "READY" ||
    job.status === "FAILED" ||
    job.status === "CANCELLED"
  ) {
    return { ok: true };
  }

  if (job.status === "PENDING") {
    const running = await markAutoThumbJobRunning(jobId);
    if (!running.ok && running.code === "NOT_FOUND") {
      return { ok: false, message: running.message };
    }
    job = await getAutoThumbJobRuntimeRecord(jobId);
    if (!job) return { ok: false, message: "Auto-thumb job not found" };
  }

  const maxAttempts = getAutoThumbMaxAttempts();
  if (job.attempts >= maxAttempts) {
    const failed = await markAutoThumbJobFailed(jobId, payload.errorMessage);
    if (failed.ok) return { ok: true };
    if (
      failed.code === "INVALID_STATE" &&
      canIgnoreTransitionFailure(failed.message)
    ) {
      return { ok: true };
    }
    return { ok: false, message: failed.message };
  }

  const retry = await markAutoThumbJobRetryPending(jobId, payload.errorMessage);
  if (!retry.ok) {
    if (
      retry.code === "INVALID_STATE" &&
      canIgnoreTransitionFailure(retry.message)
    ) {
      return { ok: true };
    }
    return { ok: false, message: retry.message };
  }

  const dispatched = await dispatchAutoThumbJob(jobId, {
    requestOrigin: options?.requestOrigin,
  });
  if (!dispatched.ok) {
    // dispatchAutoThumbJob already marked the job FAILED when invocation could not be started.
    return { ok: true };
  }

  return { ok: true };
}
