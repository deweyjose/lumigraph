import { createHash } from "node:crypto";
import { getPrisma } from "@lumigraph/db";

const MAX_ERROR_MESSAGE_LENGTH = 1000;
const DEFAULT_PENDING_JOB_LIMIT = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

type AutoThumbJobStatus = "PENDING" | "RUNNING" | "READY" | "FAILED";

type AutoThumbJobRecord = {
  id: string;
  status: AutoThumbJobStatus;
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
};

type PrismaClientLike = Awaited<ReturnType<typeof getPrisma>>;

export type AutoThumbJobView = {
  id: string;
  status: AutoThumbJobStatus;
  attempts: number;
  sourceObjectKey: string;
  sourceChecksum: string | null;
  sourceVersion: string;
  idempotencyKey: string;
  outputThumbKey: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EnqueueAutoThumbJobInput = {
  userId: string;
  postId: string;
  sourceAssetId: string;
  sourceObjectKey: string;
  sourceChecksum?: string | null;
  sourceUpdatedAt: Date;
};

type AutoThumbTransitionResult =
  | { ok: true; job: AutoThumbJobView }
  | { ok: false; code: "NOT_FOUND" | "INVALID_STATE"; message: string };

export function normalizeAutoThumbChecksum(
  checksum: string | null | undefined
): string | null {
  if (!checksum) return null;
  const value = checksum.trim();
  return value.length > 0 ? value : null;
}

export function buildAutoThumbSourceVersion(input: {
  sourceAssetId: string;
  sourceChecksum?: string | null;
  sourceUpdatedAt: Date;
}): string {
  const normalizedChecksum = normalizeAutoThumbChecksum(input.sourceChecksum);
  if (normalizedChecksum) return `checksum:${normalizedChecksum}`;
  return `asset:${input.sourceAssetId}:updated:${input.sourceUpdatedAt.getTime()}`;
}

export function buildAutoThumbIdempotencyKey(
  postId: string,
  sourceVersion: string
): string {
  return createHash("sha256")
    .update(`${postId}:${sourceVersion}`)
    .digest("hex");
}

function toAutoThumbJobView(job: AutoThumbJobRecord): AutoThumbJobView {
  return {
    id: job.id,
    status: job.status,
    attempts: job.attempts,
    sourceObjectKey: job.sourceObjectKey,
    sourceChecksum: job.sourceChecksum,
    sourceVersion: job.sourceVersion,
    idempotencyKey: job.idempotencyKey,
    outputThumbKey: job.outputThumbKey,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

async function getTransitionFailure(
  prisma: PrismaClientLike,
  jobId: string
): Promise<{
  ok: false;
  code: "NOT_FOUND" | "INVALID_STATE";
  message: string;
}> {
  const job = await prisma.autoThumbJob.findUnique({
    where: { id: jobId },
  });
  if (!job) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Auto-thumb job not found",
    };
  }
  return {
    ok: false,
    code: "INVALID_STATE",
    message: `Auto-thumb job cannot transition from status ${job.status}.`,
  };
}

export async function enqueueAutoThumbJobForUploadedFinalImage(
  input: EnqueueAutoThumbJobInput,
  options?: { prisma?: PrismaClientLike }
): Promise<{ created: boolean; job: AutoThumbJobView }> {
  const prisma = options?.prisma ?? (await getPrisma());
  const sourceChecksum = normalizeAutoThumbChecksum(input.sourceChecksum);
  const sourceVersion = buildAutoThumbSourceVersion({
    sourceAssetId: input.sourceAssetId,
    sourceChecksum,
    sourceUpdatedAt: input.sourceUpdatedAt,
  });
  const idempotencyKey = buildAutoThumbIdempotencyKey(
    input.postId,
    sourceVersion
  );

  const existing = await prisma.autoThumbJob.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    if (existing.status !== "FAILED") {
      return { created: false, job: toAutoThumbJobView(existing) };
    }
    const requeued = await prisma.autoThumbJob.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        sourceAssetId: input.sourceAssetId,
        sourceObjectKey: input.sourceObjectKey,
        sourceChecksum,
        sourceVersion,
        outputThumbKey: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });
    return { created: false, job: toAutoThumbJobView(requeued) };
  }

  try {
    const created = await prisma.autoThumbJob.create({
      data: {
        userId: input.userId,
        postId: input.postId,
        sourceAssetId: input.sourceAssetId,
        sourceObjectKey: input.sourceObjectKey,
        sourceChecksum,
        sourceVersion,
        idempotencyKey,
        status: "PENDING",
        attempts: 0,
      },
    });
    return { created: true, job: toAutoThumbJobView(created) };
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "P2002") {
      const retry = await prisma.autoThumbJob.findUniqueOrThrow({
        where: { idempotencyKey },
      });
      return { created: false, job: toAutoThumbJobView(retry) };
    }
    throw error;
  }
}

export async function listPendingAutoThumbJobs(options?: {
  limit?: number;
  maxAttempts?: number;
}): Promise<AutoThumbJobView[]> {
  const limit =
    typeof options?.limit === "number" && options.limit > 0
      ? Math.min(options.limit, 200)
      : DEFAULT_PENDING_JOB_LIMIT;
  const maxAttempts =
    typeof options?.maxAttempts === "number" && options.maxAttempts > 0
      ? options.maxAttempts
      : DEFAULT_MAX_ATTEMPTS;

  const prisma = await getPrisma();
  const jobs = await prisma.autoThumbJob.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: maxAttempts },
    },
    orderBy: [{ attempts: "asc" }, { updatedAt: "asc" }],
    take: limit,
  });
  return jobs.map((job) => toAutoThumbJobView(job));
}

export async function markAutoThumbJobRunning(
  jobId: string
): Promise<AutoThumbTransitionResult> {
  const prisma = await getPrisma();
  const now = new Date();
  const updated = await prisma.autoThumbJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: {
      status: "RUNNING",
      startedAt: now,
      completedAt: null,
      errorMessage: null,
      attempts: { increment: 1 },
    },
  });
  if (updated.count === 1) {
    const job = await prisma.autoThumbJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    return { ok: true, job: toAutoThumbJobView(job) };
  }
  return getTransitionFailure(prisma, jobId);
}

export async function markAutoThumbJobReady(
  jobId: string,
  outputThumbKey: string
): Promise<AutoThumbTransitionResult> {
  const prisma = await getPrisma();
  const updated = await prisma.autoThumbJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: {
      status: "READY",
      outputThumbKey,
      completedAt: new Date(),
      errorMessage: null,
    },
  });
  if (updated.count === 1) {
    const job = await prisma.autoThumbJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    return { ok: true, job: toAutoThumbJobView(job) };
  }
  return getTransitionFailure(prisma, jobId);
}

export async function markAutoThumbJobFailed(
  jobId: string,
  errorMessage?: string
): Promise<AutoThumbTransitionResult> {
  const prisma = await getPrisma();
  const message = (errorMessage ?? "Auto-thumb generation failed")
    .trim()
    .slice(0, MAX_ERROR_MESSAGE_LENGTH);
  const updated = await prisma.autoThumbJob.updateMany({
    where: { id: jobId, status: { in: ["PENDING", "RUNNING"] } },
    data: {
      status: "FAILED",
      errorMessage: message,
      completedAt: new Date(),
    },
  });
  if (updated.count === 1) {
    const job = await prisma.autoThumbJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    return { ok: true, job: toAutoThumbJobView(job) };
  }
  return getTransitionFailure(prisma, jobId);
}
