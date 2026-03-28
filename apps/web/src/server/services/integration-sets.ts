import type { PrismaClient } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";

/** Prisma interactive transaction client (for nested writes in one transaction). */
type DbTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export class InvalidIntegrationSelectionForPostError extends Error {
  constructor() {
    super("Invalid integration set selection for this post");
    this.name = "InvalidIntegrationSelectionForPostError";
  }
}

/**
 * Clears `postId` for the owner's sets linked to this post, then links the
 * given set IDs. Validates that every ID belongs to the user when non-empty.
 * Must run inside a transaction that also updates the post when used for atomic edits.
 */
export async function replacePostIntegrationSetLinksTx(
  tx: DbTx,
  userId: string,
  postId: string,
  integrationSetIds: string[]
): Promise<void> {
  if (integrationSetIds.length > 0) {
    const owned = await tx.integrationSet.findMany({
      where: { userId, id: { in: integrationSetIds } },
      select: { id: true },
    });
    if (owned.length !== integrationSetIds.length) {
      throw new InvalidIntegrationSelectionForPostError();
    }
  }

  await tx.integrationSet.updateMany({
    where: { userId, postId },
    data: { postId: null },
  });
  for (const id of integrationSetIds) {
    await tx.integrationSet.update({
      where: { id, userId },
      data: { postId },
    });
  }
}

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

/**
 * Sets which integration sets link to a post. Clears `postId` for any of the
 * user's sets previously linked to this post, then links the given set IDs.
 */
export async function syncPostIntegrationSets(
  userId: string,
  postId: string,
  integrationSetIds: string[]
): Promise<boolean> {
  const prisma = await getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post || post.userId !== userId) return false;
      await replacePostIntegrationSetLinksTx(
        tx,
        userId,
        postId,
        integrationSetIds
      );
      return true;
    });
  } catch (err) {
    if (err instanceof InvalidIntegrationSelectionForPostError) return false;
    throw err;
  }
}
