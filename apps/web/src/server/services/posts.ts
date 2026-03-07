import { getPrisma, type Prisma } from "@lumigraph/db";

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
      ...(input.description !== undefined && { description: input.description }),
      ...(input.targetName !== undefined && { targetName: input.targetName }),
      ...(input.targetType !== undefined && { targetType: input.targetType }),
      ...(input.captureDate !== undefined && { captureDate: input.captureDate }),
      ...(input.bortle !== undefined && { bortle: input.bortle }),
    },
    include: postInclude,
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
    include: {
      ...postInclude,
      integrationSets: {
        include: {
          assets: {
            where: { status: "UPLOADED", kind: "INTEGRATION" },
            orderBy: { relativePath: "asc" },
          },
        },
      },
    },
  });
  if (!post) return null;
  if (post.status === "PUBLISHED") return post;
  if (userId && post.userId === userId) return post;
  return null;
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
