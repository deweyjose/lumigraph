import type { Prisma } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";
import * as postRepo from "../repo/post";

export type CreateDraftInput = Omit<
  Prisma.ImagePostCreateInput,
  "user"
> & {
  title: string;
  slug: string;
};

export type UpdateDraftInput = Prisma.ImagePostUpdateInput;

export async function createDraft(userId: string, data: CreateDraftInput) {
  const prisma = await getPrisma();
  return postRepo.create(prisma, {
    ...data,
    user: { connect: { id: userId } },
  });
}

export async function updateDraft(
  userId: string,
  postId: string,
  data: UpdateDraftInput
) {
  const prisma = await getPrisma();
  const existing = await postRepo.findById(prisma, postId);
  if (!existing) return null;
  if (existing.userId !== userId) return null;
  return postRepo.update(prisma, postId, data);
}
