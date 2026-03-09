import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getPrisma } from "@lumigraph/db";
import {
  getAutoThumbMaxAttempts,
  listPendingAutoThumbJobs,
  markAutoThumbJobFailed,
  markAutoThumbJobReady,
  markAutoThumbJobRetryPending,
  markAutoThumbJobRunning,
} from "./auto-thumb-jobs";
import { getS3Bucket, getS3Client, imageAutoThumbKey } from "./s3";

const DEFAULT_BATCH_LIMIT = 10;
const DEFAULT_MAX_WIDTH = 1024;
const DEFAULT_MAX_HEIGHT = 1024;
const DEFAULT_WEBP_QUALITY = 82;

type WorkerJobRow = {
  id: string;
  userId: string;
  postId: string;
  status: "PENDING" | "RUNNING" | "READY" | "FAILED";
  attempts: number;
  sourceObjectKey: string;
  outputThumbKey: string | null;
};

type AutoThumbWorkerDependencies = {
  readObject: (bucket: string, key: string) => Promise<Buffer>;
  writeObject: (
    bucket: string,
    key: string,
    data: Buffer,
    contentType: string
  ) => Promise<void>;
  createThumbnail: (
    source: Buffer,
    options: { maxWidth: number; maxHeight: number; webpQuality: number }
  ) => Promise<Buffer>;
};

export type ProcessAutoThumbJobResult =
  | {
      ok: true;
      jobId: string;
      outputThumbKey: string;
      processed: boolean;
      attempts: number;
    }
  | {
      ok: false;
      jobId: string;
      code: "NOT_FOUND" | "INVALID_STATE" | "RETRY_SCHEDULED" | "FAILED";
      message: string;
      attempts?: number;
    };

export type AutoThumbWorkerBatchResult = {
  requested: number;
  processed: number;
  alreadyReady: number;
  retryScheduled: number;
  failed: number;
  skipped: number;
  results: ProcessAutoThumbJobResult[];
};

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function getAutoThumbWorkerBatchLimit(): number {
  return parsePositiveInt(
    process.env.AUTO_THUMB_WORKER_BATCH_LIMIT,
    DEFAULT_BATCH_LIMIT
  );
}

export function getAutoThumbMaxWidth(): number {
  return parsePositiveInt(process.env.AUTO_THUMB_MAX_WIDTH, DEFAULT_MAX_WIDTH);
}

export function getAutoThumbMaxHeight(): number {
  return parsePositiveInt(
    process.env.AUTO_THUMB_MAX_HEIGHT,
    DEFAULT_MAX_HEIGHT
  );
}

export function getAutoThumbWebpQuality(): number {
  const quality = parsePositiveInt(
    process.env.AUTO_THUMB_WEBP_QUALITY,
    DEFAULT_WEBP_QUALITY
  );
  return Math.min(100, Math.max(1, quality));
}

function trimErrorMessage(value: unknown): string {
  const message = value instanceof Error ? value.message : String(value);
  return message.trim().slice(0, 1000);
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) throw new Error("S3 object body was empty");

  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const withTransform = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransform.transformToByteArray === "function") {
    const bytes = await withTransform.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    const asyncIterable = body as AsyncIterable<Uint8Array | string>;
    const chunks: Buffer[] = [];
    for await (const chunk of asyncIterable) {
      chunks.push(
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk)
      );
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported S3 object body type");
}

async function defaultCreateThumbnail(
  source: Buffer,
  options: { maxWidth: number; maxHeight: number; webpQuality: number }
): Promise<Buffer> {
  type SharpPipeline = {
    rotate: () => SharpPipeline;
    resize: (options: {
      width: number;
      height: number;
      fit: "inside";
      withoutEnlargement: true;
    }) => SharpPipeline;
    webp: (options: {
      quality: number;
      effort: number;
      smartSubsample: boolean;
    }) => SharpPipeline;
    toBuffer: () => Promise<Buffer>;
  };
  let sharpModule: unknown;
  try {
    sharpModule = await import("sharp");
  } catch {
    throw new Error("sharp dependency is required for auto-thumb worker");
  }
  const sharpFn = (sharpModule as { default: (input: Buffer) => SharpPipeline })
    .default;
  return sharpFn(source)
    .rotate()
    .resize({
      width: options.maxWidth,
      height: options.maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: options.webpQuality,
      effort: 4,
      smartSubsample: true,
    })
    .toBuffer();
}

function buildDefaultDependencies(): AutoThumbWorkerDependencies {
  return {
    async readObject(bucket, key) {
      const client = await getS3Client();
      const output = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return bodyToBuffer(output.Body);
    },
    async writeObject(bucket, key, data, contentType) {
      const client = await getS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        })
      );
    },
    createThumbnail: defaultCreateThumbnail,
  };
}

async function getWorkerJob(jobId: string): Promise<WorkerJobRow | null> {
  const prisma = await getPrisma();
  return prisma.autoThumbJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      userId: true,
      postId: true,
      status: true,
      attempts: true,
      sourceObjectKey: true,
      outputThumbKey: true,
    },
  });
}

export async function processAutoThumbJob(
  jobId: string,
  options?: {
    maxAttempts?: number;
    dependencies?: Partial<AutoThumbWorkerDependencies>;
    maxWidth?: number;
    maxHeight?: number;
    webpQuality?: number;
  }
): Promise<ProcessAutoThumbJobResult> {
  const maxAttempts = options?.maxAttempts ?? getAutoThumbMaxAttempts();
  const maxWidth = options?.maxWidth ?? getAutoThumbMaxWidth();
  const maxHeight = options?.maxHeight ?? getAutoThumbMaxHeight();
  const webpQuality = options?.webpQuality ?? getAutoThumbWebpQuality();
  const defaults = buildDefaultDependencies();
  const deps = {
    ...defaults,
    ...options?.dependencies,
  };
  const bucket = getS3Bucket();

  const existing = await getWorkerJob(jobId);
  if (!existing) {
    return {
      ok: false,
      jobId,
      code: "NOT_FOUND",
      message: "Auto-thumb job not found",
    };
  }

  if (existing.status === "READY" && existing.outputThumbKey) {
    return {
      ok: true,
      jobId,
      outputThumbKey: existing.outputThumbKey,
      processed: false,
      attempts: existing.attempts,
    };
  }

  const running = await markAutoThumbJobRunning(jobId);
  if (!running.ok) {
    const latest = await getWorkerJob(jobId);
    if (latest?.status === "READY" && latest.outputThumbKey) {
      return {
        ok: true,
        jobId,
        outputThumbKey: latest.outputThumbKey,
        processed: false,
        attempts: latest.attempts,
      };
    }
    return {
      ok: false,
      jobId,
      code: running.code,
      message: running.message,
    };
  }

  const claimed = await getWorkerJob(jobId);
  if (!claimed) {
    return {
      ok: false,
      jobId,
      code: "NOT_FOUND",
      message: "Auto-thumb job not found after claim",
    };
  }

  try {
    const source = await deps.readObject(bucket, claimed.sourceObjectKey);
    const thumb = await deps.createThumbnail(source, {
      maxWidth,
      maxHeight,
      webpQuality,
    });
    const outputThumbKey = imageAutoThumbKey(
      claimed.userId,
      claimed.postId,
      claimed.id
    );
    await deps.writeObject(bucket, outputThumbKey, thumb, "image/webp");

    const ready = await markAutoThumbJobReady(jobId, outputThumbKey);
    if (!ready.ok) {
      return {
        ok: false,
        jobId,
        code: ready.code,
        message: ready.message,
        attempts: claimed.attempts,
      };
    }

    return {
      ok: true,
      jobId,
      outputThumbKey,
      processed: true,
      attempts: ready.job.attempts,
    };
  } catch (error) {
    const message = trimErrorMessage(error);
    if (claimed.attempts >= maxAttempts) {
      await markAutoThumbJobFailed(jobId, message);
      return {
        ok: false,
        jobId,
        code: "FAILED",
        message,
        attempts: claimed.attempts,
      };
    }

    await markAutoThumbJobRetryPending(jobId, message);
    return {
      ok: false,
      jobId,
      code: "RETRY_SCHEDULED",
      message,
      attempts: claimed.attempts,
    };
  }
}

export async function runAutoThumbWorkerBatch(options?: {
  limit?: number;
  maxAttempts?: number;
  dependencies?: Partial<AutoThumbWorkerDependencies>;
  maxWidth?: number;
  maxHeight?: number;
  webpQuality?: number;
}): Promise<AutoThumbWorkerBatchResult> {
  const maxAttempts = options?.maxAttempts ?? getAutoThumbMaxAttempts();
  const limit = options?.limit ?? getAutoThumbWorkerBatchLimit();
  const jobs = await listPendingAutoThumbJobs({ limit, maxAttempts });

  const results: ProcessAutoThumbJobResult[] = [];
  for (const job of jobs) {
    const result = await processAutoThumbJob(job.id, {
      maxAttempts,
      dependencies: options?.dependencies,
      maxWidth: options?.maxWidth,
      maxHeight: options?.maxHeight,
      webpQuality: options?.webpQuality,
    });
    results.push(result);
  }

  return {
    requested: jobs.length,
    processed: results.filter((r) => r.ok && r.processed).length,
    alreadyReady: results.filter((r) => r.ok && !r.processed).length,
    retryScheduled: results.filter((r) => !r.ok && r.code === "RETRY_SCHEDULED")
      .length,
    failed: results.filter((r) => !r.ok && r.code === "FAILED").length,
    skipped: results.filter(
      (r) => !r.ok && (r.code === "NOT_FOUND" || r.code === "INVALID_STATE")
    ).length,
    results,
  };
}
