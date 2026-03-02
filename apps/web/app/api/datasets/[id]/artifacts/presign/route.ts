import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  createPresignedUploadForArtifact,
  ALLOWED_ARTIFACT_CONTENT_TYPES,
  getMaxArtifactSizeBytes,
} from "@/server/services/artifact";

const IdParamSchema = z.object({ id: z.string().uuid() });

const PresignBodySchema = z.object({
  filename: z.string().min(1).max(500),
  contentType: z.enum(ALLOWED_ARTIFACT_CONTENT_TYPES),
  contentLength: z
    .number()
    .int()
    .nonnegative()
    .max(getMaxArtifactSizeBytes(), "File size exceeds maximum allowed"),
});

export type PresignArtifactBody = z.infer<typeof PresignBodySchema>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to request a presigned upload" },
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
  const { id: datasetId } = paramResult.data;

  let body: PresignArtifactBody;
  try {
    const raw = await request.json();
    body = PresignBodySchema.parse(raw);
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

  const result = await createPresignedUploadForArtifact(
    datasetId,
    session.user.id,
    {
      filename: body.filename,
      contentType: body.contentType,
      contentLength: body.contentLength,
    }
  );

  if (!result) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Dataset not found or you do not own it",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    uploadUrl: result.uploadUrl,
    key: result.key,
  });
}
