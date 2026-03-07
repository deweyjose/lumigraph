import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { createDraft, listMyPosts } from "@/server/services/posts";

const TargetType = z.enum([
  "GALAXY",
  "NEBULA",
  "STAR_CLUSTER",
  "PLANETARY_NEBULA",
  "OTHER",
]);

const CreatePostSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  description: z.string().max(10_000).optional().nullable(),
  targetName: z.string().max(255).optional().nullable(),
  targetType: TargetType.optional().nullable(),
  captureDate: z.string().datetime().optional().nullable(),
  bortle: z.number().int().min(1).max(9).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to list your posts" },
      { status: 401 }
    );
  }
  const posts = await listMyPosts(session.user.id);
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to create a post" },
      { status: 401 }
    );
  }

  try {
    const body = CreatePostSchema.parse(await request.json());
    const post = await createDraft(session.user.id, {
      title: body.title,
      slug: body.slug,
      description: body.description ?? null,
      targetName: body.targetName ?? null,
      targetType: body.targetType ?? null,
      captureDate: body.captureDate ? new Date(body.captureDate) : null,
      bortle: body.bortle ?? null,
    });
    return NextResponse.json(post, { status: 201 });
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
    const message = err instanceof Error ? err.message : "Create failed";
    if (message.includes("Unique constraint") || message.includes("slug")) {
      return NextResponse.json(
        { code: "SLUG_TAKEN", message: "This slug is already in use" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Failed to create post" },
      { status: 500 }
    );
  }
}
