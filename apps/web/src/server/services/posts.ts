import { Prisma } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";
import { deleteS3Object, getS3Bucket } from "./s3";
import { replacePostIntegrationSetLinksTx } from "./integration-sets";

export type CreatePostInput = {
  title: string;
  slug: string;
  description?: string | null;
  targetName?: string | null;
  targetType?:
    | "GALAXY"
    | "NEBULA"
    | "STAR_CLUSTER"
    | "PLANETARY_NEBULA"
    | "OTHER"
    | null;
  captureDate?: Date | null;
  bortle?: number | null;
};

export type UpdatePostInput = Partial<CreatePostInput>;

const postInclude = {
  finalImageAsset: true,
  finalThumbAsset: true,
} satisfies Prisma.PostInclude;

/** Single include shape so TS infers `integrationSets[].assets` (spread breaks payload inference). */
const postWithLinkedIntegrationSummariesArgs =
  Prisma.validator<Prisma.PostDefaultArgs>()({
    include: {
      ...postInclude,
      integrationSets: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          notes: true,
          assets: {
            where: { status: "UPLOADED", kind: "INTEGRATION" },
            orderBy: { relativePath: "asc" },
            select: {
              relativePath: true,
              filename: true,
              contentType: true,
              sizeBytes: true,
            },
          },
        },
      },
    },
  });

export type PostWithLinkedIntegrationSummaries = Prisma.PostGetPayload<
  typeof postWithLinkedIntegrationSummariesArgs
>;

export async function createDraft(userId: string, input: CreatePostInput) {
  const prisma = await getPrisma();
  return prisma.post.create({
    data: {
      userId,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      targetName: input.targetName ?? null,
      targetType: input.targetType ?? null,
      captureDate: input.captureDate ?? null,
      bortle: input.bortle ?? null,
      status: "DRAFT",
    },
    include: postInclude,
  });
}

export async function updatePostDraft(
  userId: string,
  postId: string,
  input: UpdatePostInput
) {
  const prisma = await getPrisma();
  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing || existing.userId !== userId) return null;
  return prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.targetName !== undefined && { targetName: input.targetName }),
      ...(input.targetType !== undefined && { targetType: input.targetType }),
      ...(input.captureDate !== undefined && {
        captureDate: input.captureDate,
      }),
      ...(input.bortle !== undefined && { bortle: input.bortle }),
    },
    include: postInclude,
  });
}

export type UpdatePostDraftWithIntegrationInput = UpdatePostInput & {
  integrationSetIds?: string[];
};

/**
 * Updates draft fields and optionally integration-set links in a single
 * transaction so partial writes are impossible.
 */
export async function updatePostDraftWithIntegrationSync(
  userId: string,
  postId: string,
  input: UpdatePostDraftWithIntegrationInput
) {
  const prisma = await getPrisma();
  const { integrationSetIds, ...postInput } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.post.findUnique({ where: { id: postId } });
    if (!existing || existing.userId !== userId) return null;

    const data: Prisma.PostUpdateInput = {};
    if (postInput.title !== undefined) data.title = postInput.title;
    if (postInput.slug !== undefined) data.slug = postInput.slug;
    if (postInput.description !== undefined)
      data.description = postInput.description;
    if (postInput.targetName !== undefined)
      data.targetName = postInput.targetName;
    if (postInput.targetType !== undefined)
      data.targetType = postInput.targetType;
    if (postInput.captureDate !== undefined)
      data.captureDate = postInput.captureDate;
    if (postInput.bortle !== undefined) data.bortle = postInput.bortle;

    if (Object.keys(data).length > 0) {
      await tx.post.update({ where: { id: postId }, data });
    }

    if (integrationSetIds !== undefined) {
      await replacePostIntegrationSetLinksTx(
        tx,
        userId,
        postId,
        integrationSetIds
      );
    }

    return tx.post.findUnique({
      where: { id: postId },
      include: postInclude,
    });
  });
}

export async function publishPost(userId: string, postId: string) {
  const prisma = await getPrisma();
  const existing = await prisma.post.findUnique({ where: { id: postId } });
  if (!existing || existing.userId !== userId) return null;
  return prisma.post.update({
    where: { id: postId },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    include: postInclude,
  });
}

export async function listMyPosts(userId: string) {
  const prisma = await getPrisma();
  return prisma.post.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    include: postInclude,
  });
}

/** Owner’s posts with integration-set file lists (for workspace / drafts summaries). */
export async function listMyPostsWithIntegrationAssets(
  userId: string
): Promise<PostWithLinkedIntegrationSummaries[]> {
  const prisma = await getPrisma();
  return prisma.post.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    ...postWithLinkedIntegrationSummariesArgs,
  });
}

export async function listPublicPosts(options?: { limit?: number }) {
  const prisma = await getPrisma();
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: options?.limit ?? 50,
    include: postInclude,
  });
}

export async function getPostBySlugForView(
  slug: string,
  userId: string | null | undefined
) {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { slug },
    ...postWithLinkedIntegrationSummariesArgs,
  });
  if (!post) return null;
  if (post.status === "PUBLISHED") return post;
  if (userId && post.userId === userId) return post;
  return null;
}

/** Owner-only post for the edit screen (integration sets with assets for summaries). */
export async function getPostBySlugForOwnerEdit(slug: string, userId: string) {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { slug },
    ...postWithLinkedIntegrationSummariesArgs,
  });
  if (!post || post.userId !== userId) return null;
  return post;
}

export async function getPostForOwner(postId: string, userId: string) {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      ...postInclude,
      integrationSets: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!post || post.userId !== userId) return null;
  return post;
}

/**
 * Deletes an owned post, unlinks integration sets (DB `SetNull`), cascades
 * related rows, then best-effort deletes referenced S3 objects.
 */
export async function deletePostForOwner(
  postId: string,
  userId: string
): Promise<"deleted" | "not_found"> {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      finalImageAssetId: true,
      finalThumbAssetId: true,
    },
  });
  if (!post || post.userId !== userId) return "not_found";

  const finalIds = [post.finalImageAssetId, post.finalThumbAssetId].filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );

  const [assets, thumbJobs] = await Promise.all([
    prisma.asset.findMany({
      where: {
        userId,
        OR: [
          { postId },
          ...(finalIds.length > 0 ? [{ id: { in: finalIds } }] : []),
        ],
      },
      select: { s3Key: true },
    }),
    prisma.autoThumbJob.findMany({
      where: { postId, userId },
      select: { outputThumbKey: true, sourceObjectKey: true },
    }),
  ]);

  const keys = new Set<string>();
  for (const a of assets) keys.add(a.s3Key);
  for (const j of thumbJobs) {
    if (j.outputThumbKey) keys.add(j.outputThumbKey);
    if (j.sourceObjectKey) keys.add(j.sourceObjectKey);
  }

  await prisma.post.delete({ where: { id: postId } });

  let bucket: string;
  try {
    bucket = getS3Bucket();
  } catch {
    return "deleted";
  }
  for (const key of keys) {
    try {
      await deleteS3Object(bucket, key);
    } catch (err) {
      console.error("[post-delete] S3 object delete failed", {
        postId,
        key,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return "deleted";
}

export async function setPostFinalAsset(
  userId: string,
  postId: string,
  role: "image" | "thumb",
  assetId: string
) {
  const prisma = await getPrisma();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== userId) return null;
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (
    !asset ||
    asset.userId !== userId ||
    asset.postId !== postId ||
    asset.status !== "UPLOADED"
  ) {
    return null;
  }
  return prisma.post.update({
    where: { id: postId },
    data:
      role === "image"
        ? { finalImageAssetId: assetId }
        : { finalThumbAssetId: assetId },
    include: postInclude,
  });
}
