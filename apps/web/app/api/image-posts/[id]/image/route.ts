import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { getPresignedFinalImageUrl } from "@/server/services/final-image";

const IdParamSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/image-posts/[id]/image
 * Redirects to a presigned S3 URL for the post's final image if the requester may view it.
 * Use when finalImageUrl stores an S3 key (our upload). For external URLs, use the URL directly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const url = await getPresignedFinalImageUrl(imagePostId, "image", userId);
  if (!url) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Image not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.redirect(url, { status: 302 });
}
