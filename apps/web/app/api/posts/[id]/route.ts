import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import { toJsonSafe } from "@/server/json";
import { getPostForOwner, updatePostDraft } from "@/server/services/posts";

const TargetType = z.enum([
  "GALAXY",
  "NEBULA",
  "STAR_CLUSTER",
  "PLANETARY_NEBULA",
  "OTHER",
]);

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
    .optional(),
  description: z.string().max(10_000).optional().nullable(),
  targetName: z.string().max(255).optional().nullable(),
  targetType: TargetType.optional().nullable(),
  captureDate: z.string().datetime().optional().nullable(),
  bortle: z.number().int().min(1).max(9).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to view a post");
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }

  const post = await getPostForOwner(id, session.user.id);
  if (!post) {
    return apiError(404, "NOT_FOUND", "Post not found or you do not own it");
  }

  return NextResponse.json(toJsonSafe(post));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to update a post");
  }
  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }
  try {
    const body = UpdateSchema.parse(await request.json());
    const post = await updatePostDraft(session.user.id, id, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.targetName !== undefined && { targetName: body.targetName }),
      ...(body.targetType !== undefined && { targetType: body.targetType }),
      ...(body.captureDate !== undefined && {
        captureDate: body.captureDate ? new Date(body.captureDate) : null,
      }),
      ...(body.bortle !== undefined && { bortle: body.bortle }),
    });
    if (!post) {
      return apiError(404, "NOT_FOUND", "Post not found or you do not own it");
    }
    return NextResponse.json(toJsonSafe(post));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err);
    }
    const message = err instanceof Error ? err.message : "Update failed";
    if (message.includes("Unique constraint") || message.includes("slug")) {
      return apiError(409, "SLUG_TAKEN", "This slug is already in use");
    }
    return apiError(500, "SERVER_ERROR", "Failed to update post");
  }
}
