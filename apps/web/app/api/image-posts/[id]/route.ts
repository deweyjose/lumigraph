import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { updateDraft } from "@/server/services/image-post";

const PostVisibility = z.enum(["DRAFT", "PRIVATE", "UNLISTED", "PUBLIC"]);
const TargetType = z.enum([
  "GALAXY",
  "NEBULA",
  "STAR_CLUSTER",
  "PLANETARY_NEBULA",
  "OTHER",
]);

const UpdateImagePostBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
      "Slug must be alphanumeric and hyphens only"
    )
    .optional(),
  description: z.string().max(10_000).optional().nullable(),
  visibility: PostVisibility.optional(),
  targetName: z.string().max(255).optional().nullable(),
  targetType: TargetType.optional().nullable(),
  captureDate: z.string().datetime().optional().nullable(),
  bortle: z.number().int().min(1).max(9).optional().nullable(),
});

export type UpdateImagePostBody = z.infer<typeof UpdateImagePostBodySchema>;

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

  let body: UpdateImagePostBody;
  try {
    const raw = await request.json();
    body = UpdateImagePostBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((e) => e.message).join("; ");
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const updateData = {
    ...body,
    ...(body.captureDate !== undefined && {
      captureDate: body.captureDate ? new Date(body.captureDate) : null,
    }),
  };

  try {
    const post = await updateDraft(session.user.id, id, updateData);
    if (!post) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Post not found or you do not own it" },
        { status: 404 }
      );
    }
    return NextResponse.json(post);
  } catch (err) {
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
