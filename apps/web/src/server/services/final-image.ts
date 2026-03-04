/**
 * Final image upload and proxy for image posts.
 * Presigned upload (original + optional thumb), complete registration, and
 * presigned read URLs for display. S3 keys are stored in finalImageUrl /
 * finalImageThumbUrl when the image comes from our upload flow.
 */

import { getPrisma } from "@lumigraph/db";
import * as postRepo from "../repo/post";
import * as s3 from "./s3";

/** Content types allowed for final image uploads. */
export const ALLOWED_FINAL_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedFinalImageContentType =
  (typeof ALLOWED_FINAL_IMAGE_CONTENT_TYPES)[number];

/** Max final image size (default 20MB). */
const DEFAULT_MAX_FINAL_IMAGE_BYTES = 20 * 1024 * 1024;

export function getMaxFinalImageSizeBytes(): number {
  const raw = process.env.FINAL_IMAGE_MAX_SIZE_BYTES;
  if (raw == null || raw === "") return DEFAULT_MAX_FINAL_IMAGE_BYTES;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MAX_FINAL_IMAGE_BYTES;
  return n;
}

/** True if the stored value is an S3 key (our upload), not an external URL. */
export function isFinalImageS3Key(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("users/");
}

export type PresignFinalImageInput = {
  filename: string;
  contentType: AllowedFinalImageContentType;
  contentLength: number;
};

export type PresignFinalImageResult = {
  uploadUrl: string;
  key: string;
};

/**
 * Creates a presigned PUT URL for uploading a final image or thumb for an image post.
 * Verifies the user owns the post. Key: users/{userId}/images/{imagePostId}/final/{filename}.
 * Returns null if post not found or not owned.
 */
export async function createPresignedUploadForFinalImage(
  imagePostId: string,
  userId: string,
  input: PresignFinalImageInput
): Promise<PresignFinalImageResult | null> {
  const prisma = await getPrisma();
  const post = await postRepo.findById(prisma, imagePostId);
  if (!post || post.userId !== userId) return null;

  const key = s3.imageFinalKey(userId, imagePostId, input.filename);
  const bucket = s3.getS3Bucket();
  const uploadUrl = await s3.createPresignedUploadUrl(bucket, key, {
    contentType: input.contentType,
  });
  return { uploadUrl, key };
}

export type CompleteFinalImagePayload = {
  key: string;
  role: "image" | "thumb";
};

/**
 * Registers an uploaded final image or thumb by storing the S3 key on the post.
 * Verifies post ownership and that the key belongs to this post's final image path.
 * Returns the updated post or null.
 */
export async function completeFinalImage(
  imagePostId: string,
  userId: string,
  payload: CompleteFinalImagePayload
) {
  const prisma = await getPrisma();
  const post = await postRepo.findById(prisma, imagePostId);
  if (!post || post.userId !== userId) return null;

  const expectedPrefix = `users/${userId}/images/${imagePostId}/final/`;
  if (!payload.key.startsWith(expectedPrefix)) return null;

  const update =
    payload.role === "image"
      ? { finalImageUrl: payload.key }
      : { finalImageThumbUrl: payload.key };
  return postRepo.update(prisma, imagePostId, update);
}

/**
 * Returns a presigned GET URL for the post's final image or thumb if the requester may view it.
 * - PUBLIC / UNLISTED: anyone may view.
 * - DRAFT / PRIVATE: only owner may view.
 * If the stored value is not an S3 key (e.g. external URL), returns null; caller uses URL as-is.
 */
export async function getPresignedFinalImageUrl(
  imagePostId: string,
  role: "image" | "thumb",
  userId: string | null
): Promise<string | null> {
  const prisma = await getPrisma();
  const post = await postRepo.findById(prisma, imagePostId);
  if (!post) return null;

  const stored =
    role === "image" ? post.finalImageUrl : post.finalImageThumbUrl;
  if (!stored || !isFinalImageS3Key(stored)) return null;

  const canView =
    post.visibility === "PUBLIC" ||
    post.visibility === "UNLISTED" ||
    (userId != null && post.userId === userId);
  if (!canView) return null;

  const bucket = s3.getS3Bucket();
  return s3.createPresignedDownloadUrl(bucket, stored, { expiresIn: 3600 });
}
