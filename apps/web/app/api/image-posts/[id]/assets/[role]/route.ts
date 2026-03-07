import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { getPresignedFinalImageUrl } from "@/server/services/final-image";

const ParamsSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["image", "thumb"]),
});

/**
 * GET /api/image-posts/[id]/assets/[role]
 * Redirects to a presigned S3 URL for the post's final image or thumbnail if the requester may view it.
 * role: "image" | "thumb"
 * Use when finalImageUrl/finalImageThumbUrl store an S3 key (our upload). For external URLs, use the URL directly.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; role: string }> }
) {
  const paramResult = ParamsSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: paramResult.error.issues.map((e) => e.message).join("; "),
      },
      { status: 400 }
    );
  }
  const { id: imagePostId, role } = paramResult.data;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const url = await getPresignedFinalImageUrl(imagePostId, role, userId);
  if (!url) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: `${role === "thumb" ? "Thumbnail" : "Image"} not found or access denied`,
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(url, { status: 302 });
}
