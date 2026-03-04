import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { completeFinalImage } from "@/server/services/final-image";

const IdParamSchema = z.object({ id: z.string().uuid() });

const CompleteBodySchema = z.object({
  key: z.string().min(1).max(2048),
  role: z.enum(["image", "thumb"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Sign in to register the upload",
      },
      { status: 401 }
    );
  }

  const paramResult = IdParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: paramResult.error.issues.map((e) => e.message).join("; "),
      },
      { status: 400 }
    );
  }
  const { id: imagePostId } = paramResult.data;

  let body: z.infer<typeof CompleteBodySchema>;
  try {
    const raw = await request.json();
    body = CompleteBodySchema.parse(raw);
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

  const post = await completeFinalImage(imagePostId, session.user.id, {
    key: body.key,
    role: body.role,
  });

  if (!post) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Post not found or key is invalid",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      id: post.id,
      finalImageUrl: post.finalImageUrl,
      finalImageThumbUrl: post.finalImageThumbUrl,
    },
    { status: 200 }
  );
}
