import { getPrisma } from "@lumigraph/db";

export type CreateIntegrationSetInput = {
  title: string;
  notes?: string | null;
  postId?: string | null;
};

export type UpdateIntegrationSetInput = Partial<CreateIntegrationSetInput>;

export async function listMyIntegrationSets(userId: string) {
  const prisma = await getPrisma();
  return prisma.integrationSet.findMany({
    where: { userId },
    include: {
      post: true,
      _count: { select: { assets: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function createIntegrationSet(
  userId: string,
  input: CreateIntegrationSetInput
) {
  const prisma = await getPrisma();
  if (input.postId) {
    const post = await prisma.post.findUnique({ where: { id: input.postId } });
    if (!post || post.userId !== userId) return null;
  }
  return prisma.integrationSet.create({
    data: {
      userId,
      title: input.title,
      notes: input.notes ?? null,
      visibility: "PRIVATE",
      postId: input.postId ?? null,
    },
    include: {
      post: true,
      _count: { select: { assets: true } },
    },
  });
}

export async function updateIntegrationSet(
  userId: string,
  integrationSetId: string,
  input: UpdateIntegrationSetInput
) {
  const prisma = await getPrisma();
  const existing = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
  });
  if (!existing || existing.userId !== userId) return null;

  if (
    input.postId !== undefined &&
    input.postId !== null &&
    input.postId !== ""
  ) {
    const post = await prisma.post.findUnique({ where: { id: input.postId } });
    if (!post || post.userId !== userId) return null;
  }

  return prisma.integrationSet.update({
    where: { id: integrationSetId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.postId !== undefined && {
        postId: input.postId && input.postId !== "" ? input.postId : null,
      }),
    },
    include: {
      post: true,
      _count: { select: { assets: true } },
    },
  });
}

export async function getIntegrationSetForOwner(
  integrationSetId: string,
  userId: string
) {
  const prisma = await getPrisma();
  const item = await prisma.integrationSet.findUnique({
    where: { id: integrationSetId },
    include: {
      post: true,
      _count: { select: { assets: true } },
    },
  });
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function getIntegrationSetById(integrationSetId: string) {
  const prisma = await getPrisma();
  return prisma.integrationSet.findUnique({ where: { id: integrationSetId } });
}
