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
