import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { toJsonSafe } from "@/server/json";
import { updatePostDraft } from "@/server/services/posts";

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to update a post" },
      { status: 401 }
    );
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Missing post id" },
      { status: 400 }
    );
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
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Post not found or you do not own it" },
        { status: 404 }
      );
    }
    return NextResponse.json(toJsonSafe(post));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: err.issues.map((i) => i.message).join("; "),
        },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "Update failed";
    if (message.includes("Unique constraint") || message.includes("slug")) {
      return NextResponse.json(
        { code: "SLUG_TAKEN", message: "This slug is already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Failed to update post" },
      { status: 500 }
    );
  }
}
