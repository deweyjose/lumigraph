import { getPrisma } from "@lumigraph/db";
import * as s3 from "./s3";
import { enqueueAutoThumbJobForUploadedFinalImage } from "./auto-thumb-jobs";
import { dispatchAutoThumbJob } from "./auto-thumb-runtime";

export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  "application/zip",
  "application/x-fits",
  "image/fits",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedUploadContentType =
  (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];

const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 1024 * 1024 * 1024; // 1GB

export function getMaxUploadSizeBytes(): number {
  const raw = process.env.UPLOAD_MAX_SIZE_BYTES;
  if (!raw) return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_MAX_UPLOAD_SIZE_BYTES;
  return n;
}

type PresignInput = {
  userId: string;
  kind: "INTEGRATION" | "FINAL_IMAGE" | "FINAL_THUMB";
  integrationSetId?: string;
  postId?: string;
  relativePath: string;
  contentType: AllowedUploadContentType;
  contentLength: number;
};

export async function presignUpload(input: PresignInput) {
  const prisma = await getPrisma();
  const relativePath = sanitizeRelativePath(input.relativePath);
  if (!relativePath) return null;

  if (input.kind === "INTEGRATION") {
    if (!input.integrationSetId) return null;
    const set = await prisma.integrationSet.findUnique({
      where: { id: input.integrationSetId },
    });
    if (!set || set.userId !== input.userId) return null;
    const key = s3.integrationSetAssetKey(
      input.userId,
      input.integrationSetId,
      relativePath
    );
    return createAssetAndUrl(prisma, input, key, relativePath);
  }

  if (!input.postId) return null;
  const post = await prisma.post.findUnique({ where: { id: input.postId } });
  if (!post || post.userId !== input.userId) return null;
  const filename = relativePath.split("/").pop();
  if (!filename) return null;
  const key = s3.imageFinalKey(input.userId, input.postId, filename);
  return createAssetAndUrl(prisma, input, key, relativePath);
}

async function createAssetAndUrl(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  input: PresignInput,
  key: string,
  relativePath: string
) {
  const bucket = s3.getS3Bucket();
  const uploadUrl = await s3.createPresignedUploadUrl(bucket, key, {
    contentType: input.contentType,
  });
  const filename = relativePath.split("/").pop() ?? relativePath;
  const asset = await prisma.asset.create({
    data: {
      userId: input.userId,
      integrationSetId: input.integrationSetId ?? null,
      postId: input.postId ?? null,
      kind: input.kind,
      relativePath,
      filename,
      contentType: input.contentType,
      sizeBytes: BigInt(input.contentLength),
      s3Key: key,
      status: "PRESIGNED",
    },
  });
  return { assetId: asset.id, uploadUrl, s3Key: key };
}

export async function completeUpload(
  userId: string,
  assetId: string,
  sizeBytes: bigint,
  checksum?: string | null,
  options?: { requestOrigin?: string }
) {
  const prisma = await getPrisma();
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.userId !== userId) {
    return null;
  }

  if (asset.status === "UPLOADED") {
    if (asset.kind === "FINAL_IMAGE" && asset.postId) {
      const enqueueResult = await enqueueAutoThumbJobForUploadedFinalImage(
        {
          userId: asset.userId,
          postId: asset.postId,
          sourceAssetId: asset.id,
          sourceObjectKey: asset.s3Key,
          sourceChecksum: asset.checksum,
          sourceUpdatedAt: asset.updatedAt,
        },
        { prisma }
      );
      if (enqueueResult.job.status === "PENDING") {
        void dispatchAutoThumbJob(enqueueResult.job.id, {
          requestOrigin: options?.requestOrigin,
        }).catch(() => undefined);
      }
    }
    return asset;
  }

  if (asset.status !== "PRESIGNED") return null;

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: "UPLOADED",
      sizeBytes,
      checksum: checksum ?? null,
    },
  });

  if (updated.kind === "FINAL_IMAGE" && updated.postId) {
    const enqueueResult = await enqueueAutoThumbJobForUploadedFinalImage(
      {
        userId: updated.userId,
        postId: updated.postId,
        sourceAssetId: updated.id,
        sourceObjectKey: updated.s3Key,
        sourceChecksum: updated.checksum,
        sourceUpdatedAt: updated.updatedAt,
      },
      { prisma }
    );
    if (enqueueResult.job.status === "PENDING") {
      void dispatchAutoThumbJob(enqueueResult.job.id, {
        requestOrigin: options?.requestOrigin,
      }).catch(() => undefined);
    }
  }

  return updated;
}

function sanitizeRelativePath(input: string): string | null {
  const value = input.trim().replace(/\\/g, "/");
  if (value.length === 0) return null;
  if (value.startsWith("/")) return null;
  const parts = value.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.some((p) => p === "." || p === "..")) return null;
  return parts.join("/");
}
