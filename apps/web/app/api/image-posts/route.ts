import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { createDraft, listMyPosts } from "@/server/services/image-post";

const PostVisibility = z.enum(["DRAFT", "PRIVATE", "UNLISTED", "PUBLIC"]);
const TargetType = z.enum([
  "GALAXY",
  "NEBULA",
  "STAR_CLUSTER",
  "PLANETARY_NEBULA",
  "OTHER",
]);

const urlOptional = z.string().url().max(2048).optional();

const CreateImagePostBodySchema = z.object({
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/i,
      "Slug must be alphanumeric and hyphens only"
    ),
  description: z.string().max(10_000).optional(),
  visibility: PostVisibility.optional(),
  targetName: z.string().max(255).optional(),
  targetType: TargetType.optional(),
  captureDate: z.string().datetime().optional(),
  bortle: z.number().int().min(1).max(9).optional(),
  finalImageUrl: urlOptional,
  finalImageThumbUrl: urlOptional,
});

export type CreateImagePostBody = z.infer<typeof CreateImagePostBodySchema>;

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

  let body: CreateImagePostBody;
  try {
    const raw = await request.json();
    body = CreateImagePostBodySchema.parse(raw);
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

  try {
    const post = await createDraft(session.user.id, {
      ...body,
      ...(body.captureDate && {
        captureDate: new Date(body.captureDate),
      }),
    });
    return NextResponse.json(post, { status: 201 });
  } catch (err) {
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
