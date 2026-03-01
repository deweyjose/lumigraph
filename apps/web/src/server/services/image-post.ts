import type { Prisma } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";
import * as postRepo from "../repo/post";

export type CreateDraftInput = Omit<Prisma.ImagePostCreateInput, "user"> & {
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

export async function listMyPosts(userId: string) {
  const prisma = await getPrisma();
  return postRepo.findManyByUserId(prisma, userId, { includeDatasets: false });
}

export async function listPublicPosts(options?: { limit?: number }) {
  const prisma = await getPrisma();
  return postRepo.findManyPublic(prisma, options);
}

/**
 * Returns a post by slug if the viewer is allowed to see it: public posts, or
 * any post owned by the given userId. Otherwise null.
 */
export async function getPostBySlugForView(
  slug: string,
  userId?: string | null
) {
  const prisma = await getPrisma();
  const post = await postRepo.findBySlug(prisma, slug);
  if (!post) return null;
  if (post.visibility === "PUBLIC") return post;
  if (post.visibility === "UNLISTED") return post; // link-only: anyone with link can view
  if (userId && post.userId === userId) return post; // owner can always view
  return null;
}

/**
 * Sets post visibility to PUBLIC. Returns the updated post or null if not found/not owner.
 */
export async function publishPost(userId: string, postId: string) {
  return updateDraft(userId, postId, { visibility: "PUBLIC" });
}
