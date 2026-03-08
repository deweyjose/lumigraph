import { createHmac, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@lumigraph/db";
import {
  type InvokeCommandInput,
  InvokeCommand,
  LambdaClient,
  type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import { createPresignedDownloadUrl, getS3Bucket } from "./s3";

const DEFAULT_DOWNLOAD_MAX_FILES = 1000;
const DEFAULT_DOWNLOAD_MAX_TOTAL_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const DEFAULT_DOWNLOAD_EXPORT_TTL_HOURS = 24;
const CALLBACK_TTL_SECONDS = 300;

type IntegrationAssetRow = {
  id: string;
  relativePath: string;
  s3Key: string;
  sizeBytes: bigint;
};

type DownloadJobStatus =
  | "PENDING"
  | "RUNNING"
  | "READY"
  | "FAILED"
  | "CANCELLED";

type DownloadJobView = {
  id: string;
  status: DownloadJobStatus;
  selectedPaths: string[];
  totalFiles: number | null;
  completedFiles: number;
  lastProgressAt: string | null;
  outputS3Key: string | null;
  outputSizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
};

type CreateDownloadJobInput = {
  userId: string;
  integrationSetId: string;
  selectedPaths: string[];
  requestOrigin: string;
};

type CallbackPayload = {
  status: "RUNNING" | "FAILED" | "READY";
  totalFiles?: number;
  completedFiles?: number;
  outputS3Key?: string;
  outputSizeBytes?: number;
  errorMessage?: string;
};

function getPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function getDownloadMaxFiles(): number {
  return getPositiveIntEnv("DOWNLOAD_MAX_FILES", DEFAULT_DOWNLOAD_MAX_FILES);
}

export function getDownloadMaxTotalBytes(): number {
  return getPositiveIntEnv(
    "DOWNLOAD_MAX_TOTAL_BYTES",
    DEFAULT_DOWNLOAD_MAX_TOTAL_BYTES
  );
}

export function getDownloadExportTtlHours(): number {
  return getPositiveIntEnv(
    "DOWNLOAD_EXPORT_TTL_HOURS",
    DEFAULT_DOWNLOAD_EXPORT_TTL_HOURS
  );
}

export function integrationSetExportZipKey(
  userId: string,
  integrationSetId: string,
  jobId: string
): string {
  return `users/${userId}/exports/integration-sets/${integrationSetId}/${jobId}.zip`;
}

function sanitizeRelativePath(input: string): string | null {
  const value = input.trim().replace(/\\/g, "/").replace(/\/+/g, "/");
  if (value.length === 0) return null;
  if (value.startsWith("/")) return null;
  const trimmed = value.endsWith("/") ? value.slice(0, -1) : value;
  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => p === "." || p === "..")) return null;
  return parts.join("/");
}

function parseSelectedPathsJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

type ResolveResult =
  | { ok: true; assets: IntegrationAssetRow[]; selectedPaths: string[] }
  | { ok: false; message: string };

export function resolveSelectedAssets(
  allAssets: IntegrationAssetRow[],
  selectedPathsRaw: string[]
): ResolveResult {
  const normalized = Array.from(
    new Set(
      selectedPathsRaw
        .map((path) => sanitizeRelativePath(path))
        .filter((path): path is string => Boolean(path))
    )
  );
  if (normalized.length === 0) {
    return { ok: false, message: "No valid files or folders were selected." };
  }

  const selectedById = new Map<string, IntegrationAssetRow>();
  const unresolved: string[] = [];

  for (const path of normalized) {
    let matched = false;
    for (const asset of allAssets) {
      if (
        asset.relativePath === path ||
        asset.relativePath.startsWith(`${path}/`)
      ) {
        selectedById.set(asset.id, asset);
        matched = true;
      }
    }
    if (!matched) unresolved.push(path);
  }

  if (unresolved.length > 0) {
    return {
      ok: false,
      message: `Invalid selection: ${unresolved.join(", ")}`,
    };
  }

  return {
    ok: true,
    assets: Array.from(selectedById.values()),
    selectedPaths: normalized,
  };
}

function toDownloadJobView(job: {
  id: string;
  status: DownloadJobStatus;
  selectedPathsJson: unknown;
  totalFiles: number | null;
  completedFiles: number;
  lastProgressAt: Date | null;
  outputS3Key: string | null;
  outputSizeBytes: bigint | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
}): DownloadJobView {
  return {
    id: job.id,
    status: job.status,
    selectedPaths: parseSelectedPathsJson(job.selectedPathsJson),
    totalFiles: job.totalFiles,
    completedFiles: job.completedFiles,
    lastProgressAt: job.lastProgressAt?.toISOString() ?? null,
    outputS3Key: job.outputS3Key,
    outputSizeBytes: job.outputSizeBytes ? Number(job.outputSizeBytes) : null,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
  };
}

async function getOwnedIntegrationSet(
  integrationSetId: string,
  userId: string
): Promise<{ id: string; userId: string } | null> {
  const prisma = await getPrisma();
  const set = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
    select: { id: true, userId: true },
  });
  if (!set || set.userId !== userId) return null;
  return set;
}

async function listOwnedIntegrationAssets(
  integrationSetId: string,
  userId: string
): Promise<IntegrationAssetRow[]> {
  const prisma = await getPrisma();
  return prisma.asset.findMany({
    where: {
      userId,
      integrationSetId,
      kind: "INTEGRATION",
      status: "UPLOADED",
    },
    select: {
      id: true,
      relativePath: true,
      s3Key: true,
      sizeBytes: true,
    },
    orderBy: [{ relativePath: "asc" }],
  });
}

export async function listDownloadJobsForIntegrationSetForOwner(
  integrationSetId: string,
  userId: string
): Promise<DownloadJobView[] | null> {
  const set = await getOwnedIntegrationSet(integrationSetId, userId);
  if (!set) return null;

  const prisma = await getPrisma();
  const jobs = await prisma.downloadJob.findMany({
    where: { userId, integrationSetId },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });
  return jobs.map((job) => toDownloadJobView(job));
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

async function invokeZipLambda(payload: object): Promise<void> {
  const lambdaName = process.env.DOWNLOAD_ZIP_LAMBDA_NAME;
  if (!lambdaName) {
    throw new Error("DOWNLOAD_ZIP_LAMBDA_NAME is not set");
  }

  const client = await getLambdaClient();
  const input: InvokeCommandInput = {
    FunctionName: lambdaName,
    InvocationType: "Event",
    Payload: Buffer.from(JSON.stringify(payload)),
  };
  await client.send(new InvokeCommand(input));
}

function getCallbackBaseUrl(origin: string): string {
  const explicit = process.env.DOWNLOAD_CALLBACK_BASE_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/$/, "");
  return origin.replace(/\/$/, "");
}

export async function createDownloadExportJob(
  input: CreateDownloadJobInput
): Promise<
  { ok: true; job: DownloadJobView } | { ok: false; message: string }
> {
  const set = await getOwnedIntegrationSet(
    input.integrationSetId,
    input.userId
  );
  if (!set) return { ok: false, message: "Integration set not found" };

  const assets = await listOwnedIntegrationAssets(
    input.integrationSetId,
    input.userId
  );
  if (!process.env.DOWNLOAD_CALLBACK_SECRET) {
    return {
      ok: false,
      message:
        "DOWNLOAD_CALLBACK_SECRET is not configured for lambda export jobs.",
    };
  }
  if (!process.env.DOWNLOAD_ZIP_LAMBDA_NAME) {
    return {
      ok: false,
      message: "DOWNLOAD_ZIP_LAMBDA_NAME is not configured for export jobs.",
    };
  }

  const resolved = resolveSelectedAssets(assets, input.selectedPaths);
  if (!resolved.ok) return { ok: false, message: resolved.message };

  if (resolved.assets.length > getDownloadMaxFiles()) {
    return {
      ok: false,
      message: `Selection exceeds max file count (${getDownloadMaxFiles()}).`,
    };
  }

  const totalBytes = resolved.assets.reduce(
    (sum, asset) => sum + asset.sizeBytes,
    0n
  );
  const maxBytes = BigInt(getDownloadMaxTotalBytes());
  if (totalBytes > maxBytes) {
    return {
      ok: false,
      message: `Selection exceeds max total size (${getDownloadMaxTotalBytes()} bytes).`,
    };
  }

  const prisma = await getPrisma();
  const created = await prisma.downloadJob.create({
    data: {
      userId: input.userId,
      integrationSetId: input.integrationSetId,
      selectedPathsJson: resolved.selectedPaths,
      status: "PENDING",
      totalFiles: resolved.assets.length,
      completedFiles: 0,
      expiresAt: new Date(
        Date.now() + getDownloadExportTtlHours() * 60 * 60 * 1000
      ),
    },
  });

  const outputS3Key = integrationSetExportZipKey(
    input.userId,
    input.integrationSetId,
    created.id
  );
  await prisma.downloadJob.update({
    where: { id: created.id },
    data: { outputS3Key },
  });

  const callbackBaseUrl = getCallbackBaseUrl(input.requestOrigin);
  const callbackUrl = `${callbackBaseUrl}/api/internal/export-jobs/${created.id}/callback`;
  void invokeZipLambda({
    jobId: created.id,
    userId: input.userId,
    integrationSetId: input.integrationSetId,
    bucket: getS3Bucket(),
    outputS3Key,
    files: resolved.assets.map((asset) => ({
      relativePath: asset.relativePath,
      s3Key: asset.s3Key,
      sizeBytes: Number(asset.sizeBytes),
    })),
    callbackUrl,
  }).catch(async (err) => {
    const msg = err instanceof Error ? err.message : "Lambda invoke failed";
    const p = await getPrisma();
    await p.downloadJob.updateMany({
      where: { id: created.id, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "FAILED",
        errorMessage: msg.slice(0, 1000),
        completedAt: new Date(),
      },
    });
  });

  const refreshed = await prisma.downloadJob.findUniqueOrThrow({
    where: { id: created.id },
  });
  return { ok: true, job: toDownloadJobView(refreshed) };
}

type DownloadJobStatusResult =
  | {
      ok: true;
      job: DownloadJobView & { downloadUrl?: string; isExpired: boolean };
    }
  | { ok: false; message: string };

export async function getDownloadJobStatusForOwner(
  integrationSetId: string,
  jobId: string,
  userId: string
): Promise<DownloadJobStatusResult> {
  const prisma = await getPrisma();
  const job = await prisma.downloadJob.findUnique({
    where: { id: jobId },
  });
  if (
    !job ||
    job.userId !== userId ||
    job.integrationSetId !== integrationSetId
  ) {
    return { ok: false, message: "Download job not found" };
  }

  const now = Date.now();
  const isExpired = Boolean(job.expiresAt && job.expiresAt.getTime() <= now);
  const view = toDownloadJobView(job);

  if (job.status === "READY" && job.outputS3Key && !isExpired) {
    const downloadUrl = await createPresignedDownloadUrl(
      getS3Bucket(),
      job.outputS3Key,
      {
        responseContentDisposition: `attachment; filename="${job.id}.zip"`,
      }
    );
    return { ok: true, job: { ...view, downloadUrl, isExpired } };
  }

  return { ok: true, job: { ...view, isExpired } };
}

type CancelDownloadJobResult =
  | { ok: true; job: DownloadJobView }
  | { ok: false; code: "NOT_FOUND" | "INVALID_STATE"; message: string };

export async function cancelDownloadJobForOwner(
  integrationSetId: string,
  jobId: string,
  userId: string
): Promise<CancelDownloadJobResult> {
  const prisma = await getPrisma();
  const now = new Date();

  const updated = await prisma.downloadJob.updateMany({
    where: {
      id: jobId,
      userId,
      integrationSetId,
      status: { in: ["PENDING", "RUNNING"] },
    },
    data: {
      status: "CANCELLED",
      completedAt: now,
      errorMessage: null,
    },
  });

  const job = await prisma.downloadJob.findUnique({ where: { id: jobId } });
  if (
    !job ||
    job.userId !== userId ||
    job.integrationSetId !== integrationSetId
  ) {
    return { ok: false, code: "NOT_FOUND", message: "Download job not found" };
  }

  if (updated.count === 0 && job.status !== "CANCELLED") {
    return {
      ok: false,
      code: "INVALID_STATE",
      message: `Download job cannot be cancelled from status ${job.status}.`,
    };
  }

  return { ok: true, job: toDownloadJobView(job) };
}

function toHexHmac(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret.trim())
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function buildDownloadJobCallbackSignature(
  secret: string,
  timestamp: string,
  body: string
): string {
  return toHexHmac(secret, timestamp, body);
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

export async function applyDownloadJobCallback(
  jobId: string,
  payload: CallbackPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const prisma = await getPrisma();
  const job = await prisma.downloadJob.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, message: "Download job not found" };
  if (job.status === "CANCELLED") return { ok: true };

  if (payload.status === "RUNNING") {
    const nextTotalFiles =
      typeof payload.totalFiles === "number"
        ? payload.totalFiles
        : job.totalFiles ?? null;
    const requestedCompletedFiles =
      typeof payload.completedFiles === "number"
        ? payload.completedFiles
        : job.completedFiles;
    const boundedCompletedFiles =
      typeof nextTotalFiles === "number"
        ? Math.min(requestedCompletedFiles, nextTotalFiles)
        : requestedCompletedFiles;
    const completedFiles = Math.max(0, boundedCompletedFiles);

    const updated = await prisma.downloadJob.updateMany({
      where: {
        id: jobId,
        status: { in: ["PENDING", "RUNNING"] },
        completedFiles: { lte: completedFiles },
      },
      data: {
        status: "RUNNING",
        totalFiles: nextTotalFiles,
        completedFiles,
        lastProgressAt: new Date(),
        errorMessage: null,
      },
    });
    if (updated.count === 0) return { ok: true };
    return { ok: true };
  }

  if (payload.status === "FAILED") {
    await prisma.downloadJob.updateMany({
      where: { id: jobId, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "FAILED",
        completedFiles:
          typeof job.totalFiles === "number"
            ? Math.min(job.completedFiles, job.totalFiles)
            : job.completedFiles,
        errorMessage: (payload.errorMessage ?? "Export failed").slice(0, 1000),
        completedAt: new Date(),
      },
    });
    return { ok: true };
  }

  if (payload.status === "READY") {
    if (!payload.outputS3Key) {
      return { ok: false, message: "outputS3Key is required for READY status" };
    }
    await prisma.downloadJob.updateMany({
      where: { id: jobId, status: { in: ["PENDING", "RUNNING"] } },
      data: {
        status: "READY",
        completedFiles:
          typeof job.totalFiles === "number"
            ? job.totalFiles
            : job.completedFiles,
        lastProgressAt: new Date(),
        outputS3Key: payload.outputS3Key,
        outputSizeBytes:
          typeof payload.outputSizeBytes === "number"
            ? BigInt(payload.outputSizeBytes)
            : null,
        completedAt: new Date(),
        errorMessage: null,
      },
    });
    return { ok: true };
  }

  return { ok: false, message: "Unsupported callback status" };
}

export function verifyDownloadJobCallbackSignature(
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

  // Fallback: if intermediaries reformatted JSON whitespace, verify against
  // canonical JSON produced by JSON.stringify(parsed).
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
