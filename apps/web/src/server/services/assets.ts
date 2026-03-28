import { getPrisma } from "@lumigraph/db";
import * as s3 from "./s3";

export async function listAssetsByIntegrationSetForOwner(
  integrationSetId: string,
  userId: string
) {
  const prisma = await getPrisma();
  const set = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
  });
  if (!set || set.userId !== userId) return null;

  return prisma.asset.findMany({
    where: {
      integrationSetId,
      userId,
      status: "UPLOADED",
      kind: "INTEGRATION",
    },
    orderBy: [{ relativePath: "asc" }],
  });
}

export async function listPostFinalAssetsForOwner(
  postId: string,
  userId: string
) {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== userId) return null;
  return prisma.asset.findMany({
    where: {
      userId,
      postId,
      status: "UPLOADED",
      kind: { in: ["FINAL_IMAGE", "FINAL_THUMB"] },
    },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getAssetDownloadUrlForViewer(
  assetId: string,
  userId: string | null
) {
  const prisma = await getPrisma();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      post: true,
      integrationSet: true,
    },
  });
  if (!asset || asset.status !== "UPLOADED") return null;

  const canAccess =
    asset.userId === userId ||
    (asset.post != null && asset.post.status === "PUBLISHED");
  if (!canAccess) return null;

  const bucket = s3.getS3Bucket();
  const safeFilename = asset.filename.replace(/"/g, "'");
  const downloadUrl = await s3.createPresignedDownloadUrl(bucket, asset.s3Key, {
    responseContentDisposition: `attachment; filename="${safeFilename}"`,
  });
  return {
    downloadUrl,
    filename: asset.filename,
  };
}

export async function getAssetViewUrlForViewer(
  assetId: string,
  userId: string | null
) {
  const prisma = await getPrisma();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { post: true },
  });
  if (!asset || asset.status !== "UPLOADED") return null;
  const canAccess =
    asset.userId === userId ||
    (asset.post != null && asset.post.status === "PUBLISHED");
  if (!canAccess) return null;
  const bucket = s3.getS3Bucket();
  return s3.createPresignedDownloadUrl(bucket, asset.s3Key, {
    expiresIn: 3600,
  });
}

/**
 * Deletes an integration-set file asset for its owner (S3 object + DB row).
 */
export async function deleteIntegrationAssetForOwner(
  assetId: string,
  userId: string
): Promise<"deleted" | "not_found" | "forbidden"> {
  const prisma = await getPrisma();
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });
  if (!asset) return "not_found";
  if (asset.userId !== userId) return "forbidden";
  if (asset.kind !== "INTEGRATION" || !asset.integrationSetId) {
    return "forbidden";
  }
  if (asset.status !== "UPLOADED") return "forbidden";

  const blockingJob = await prisma.autoThumbJob.findFirst({
    where: { sourceAssetId: assetId },
  });
  if (blockingJob) return "forbidden";

  const bucket = s3.getS3Bucket();
  const s3Key = asset.s3Key;
  await prisma.$transaction((tx) =>
    tx.asset.delete({ where: { id: assetId } })
  );
  try {
    await s3.deleteS3Object(bucket, s3Key);
  } catch (err) {
    console.error("[integration-asset-delete] S3 object delete failed", {
      assetId,
      s3Key,
      message: err instanceof Error ? err.message : String(err),
    });
  }
  return "deleted";
}

/**
 * Deletes all integration assets under a folder path (prefix), e.g. "lights"
 * or "cal/darks". Does not delete the root (empty path).
 */
export async function deleteIntegrationAssetsUnderPathForOwner(
  integrationSetId: string,
  userId: string,
  folderPath: string
): Promise<
  { deletedCount: number } | "not_found" | "forbidden" | "bad_request"
> {
  const trimmed = folderPath.trim();
  if (!trimmed || trimmed.includes("..") || trimmed.startsWith("/")) {
    return "bad_request";
  }

  const prisma = await getPrisma();
  const set = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
  });
  if (!set || set.userId !== userId) return "not_found";

  const assets = await prisma.asset.findMany({
    where: {
      integrationSetId,
      userId,
      kind: "INTEGRATION",
      status: "UPLOADED",
      OR: [
        { relativePath: { startsWith: `${trimmed}/` } },
        { relativePath: trimmed },
      ],
    },
  });

  if (assets.length === 0) {
    return { deletedCount: 0 };
  }

  const blockingJob = await prisma.autoThumbJob.findFirst({
    where: { sourceAssetId: { in: assets.map((a) => a.id) } },
  });
  if (blockingJob) return "forbidden";

  const ids = assets.map((a) => a.id);
  const keys = assets.map((a) => ({ id: a.id, s3Key: a.s3Key }));
  const bucket = s3.getS3Bucket();

  await prisma.$transaction((tx) =>
    tx.asset.deleteMany({ where: { id: { in: ids } } })
  );

  for (const { id, s3Key } of keys) {
    try {
      await s3.deleteS3Object(bucket, s3Key);
    } catch (err) {
      console.error(
        "[integration-asset-delete] S3 object delete failed (folder batch)",
        {
          assetId: id,
          s3Key,
          message: err instanceof Error ? err.message : String(err),
        }
      );
    }
  }

  return { deletedCount: assets.length };
}
