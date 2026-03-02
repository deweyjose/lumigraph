import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { getPresignedDownloadForArtifact } from "@/server/services/artifact";

const IdParamSchema = z.object({ id: z.string().uuid() });

/**
 * GET /api/artifacts/[id]/download
 * Returns a redirect to a presigned S3 download URL if the requester is allowed.
 * Visibility: PRIVATE = owner only; UNLISTED/PUBLIC = anyone (optional auth).
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
  const { id: artifactId } = paramResult.data;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const result = await getPresignedDownloadForArtifact(artifactId, userId);
  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Artifact not found or access denied" },
      { status: 404 }
    );
  }

  return NextResponse.redirect(result.downloadUrl, { status: 302 });
}
