import { getPrisma } from "@lumigraph/db";
import * as artifactRepo from "../repo/artifact";
import * as datasetRepo from "../repo/dataset";
import * as s3 from "./s3";

/** Content types allowed for dataset artifact uploads (presign). */
export const ALLOWED_ARTIFACT_CONTENT_TYPES = [
  "application/zip",
  "application/x-fits",
  "image/fits",
] as const;

export type AllowedArtifactContentType =
  (typeof ALLOWED_ARTIFACT_CONTENT_TYPES)[number];

/** Max artifact size in bytes. From env ARTIFACT_MAX_SIZE_BYTES or default 500MB. */
export function getMaxArtifactSizeBytes(): number {
  const raw = process.env.ARTIFACT_MAX_SIZE_BYTES;
  if (raw == null || raw === "") return 500 * 1024 * 1024;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 500 * 1024 * 1024;
  return n;
}

export type PresignArtifactInput = {
  filename: string;
  contentType: AllowedArtifactContentType;
  contentLength: number;
};

export type PresignArtifactResult = {
  uploadUrl: string;
  key: string;
};

/**
 * Creates a presigned PUT URL for uploading a dataset artifact.
 * Verifies the user owns the dataset, builds S3 key via datasetArtifactKey, then presigns.
 * Returns null if dataset not found or not owned by the user.
 */
export async function createPresignedUploadForArtifact(
  datasetId: string,
  userId: string,
  input: PresignArtifactInput
): Promise<PresignArtifactResult | null> {
  const prisma = await getPrisma();
  const dataset = await datasetRepo.findById(prisma, datasetId);
  if (!dataset || dataset.userId !== userId) return null;

  const key = s3.datasetArtifactKey(userId, datasetId, input.filename);
  const bucket = s3.getS3Bucket();
  const uploadUrl = await s3.createPresignedUploadUrl(bucket, key, {
    contentType: input.contentType,
  });
  return { uploadUrl, key };
}

export type RegisterArtifactPayload = {
  filename: string;
  fileType: string;
  s3Key: string;
  sizeBytes: bigint;
  checksum?: string | null;
};

export async function registerArtifact(
  datasetId: string,
  userId: string,
  payload: RegisterArtifactPayload
) {
  const prisma = await getPrisma();
  const dataset = await datasetRepo.findById(prisma, datasetId);
  if (!dataset) return null;
  if (dataset.userId !== userId) return null;
  return artifactRepo.create(prisma, {
    dataset: { connect: { id: datasetId } },
    filename: payload.filename,
    fileType: payload.fileType,
    s3Key: payload.s3Key,
    sizeBytes: payload.sizeBytes,
    checksum: payload.checksum ?? undefined,
  });
}

export type PresignedDownloadResult = {
  downloadUrl: string;
  filename: string;
};

/**
 * Lists artifacts for a dataset. Caller must ensure the requester is allowed to see the dataset
 * (e.g. owner on dataset detail page, or visibility check on post page).
 */
export async function listArtifactsByDatasetId(datasetId: string) {
  const prisma = await getPrisma();
  return artifactRepo.findManyByDatasetId(prisma, datasetId);
}

/**
 * Returns a presigned download URL for a dataset artifact if the requester is allowed.
 * - PRIVATE: only the dataset owner can download.
 * - UNLISTED / PUBLIC: anyone can download (link-only or public).
 * Returns null if artifact not found or access denied.
 */
export async function getPresignedDownloadForArtifact(
  artifactId: string,
  userId: string | null
): Promise<PresignedDownloadResult | null> {
  const prisma = await getPrisma();
  const artifactWithDataset = await artifactRepo.findByIdWithDataset(
    prisma,
    artifactId
  );
  if (!artifactWithDataset) return null;

  const { dataset } = artifactWithDataset;
  if (dataset.visibility === "PRIVATE" && dataset.userId !== userId) {
    return null;
  }
  // UNLISTED and PUBLIC: allow any requester (userId may be null for public)

  const bucket = s3.getS3Bucket();
  const safeFilename = artifactWithDataset.filename.replace(/"/g, "'");
  const downloadUrl = await s3.createPresignedDownloadUrl(
    bucket,
    artifactWithDataset.s3Key,
    {
      responseContentDisposition: `attachment; filename="${safeFilename}"`,
    }
  );
  return {
    downloadUrl,
    filename: artifactWithDataset.filename,
  };
}
