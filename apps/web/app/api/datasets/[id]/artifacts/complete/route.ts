import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  registerArtifact,
  ALLOWED_ARTIFACT_CONTENT_TYPES,
} from "@/server/services/artifact";

const IdParamSchema = z.object({ id: z.string().uuid() });

const CompleteBodySchema = z.object({
  filename: z.string().min(1).max(500),
  fileType: z.enum(ALLOWED_ARTIFACT_CONTENT_TYPES),
  s3Key: z.string().min(1).max(2048),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().max(256).optional().nullable(),
});

export type CompleteArtifactBody = z.infer<typeof CompleteBodySchema>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Sign in to register an artifact",
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
  const { id: datasetId } = paramResult.data;

  let body: CompleteArtifactBody;
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

  const artifact = await registerArtifact(datasetId, session.user.id, {
    filename: body.filename,
    fileType: body.fileType,
    s3Key: body.s3Key,
    sizeBytes: BigInt(body.sizeBytes),
    checksum: body.checksum ?? undefined,
  });

  if (!artifact) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Dataset not found or you do not own it",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      id: artifact.id,
      datasetId: artifact.datasetId,
      filename: artifact.filename,
      fileType: artifact.fileType,
      s3Key: artifact.s3Key,
      sizeBytes: Number(artifact.sizeBytes),
      checksum: artifact.checksum,
      createdAt: artifact.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
