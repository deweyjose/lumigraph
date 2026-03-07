import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  getMaxUploadSizeBytes,
  presignUpload,
} from "@/server/services/uploads";

const Schema = z
  .object({
    kind: z.enum(["INTEGRATION", "FINAL_IMAGE", "FINAL_THUMB"]),
    integrationSetId: z.string().uuid().optional(),
    postId: z.string().uuid().optional(),
    relativePath: z.string().min(1).max(1024),
    contentType: z.enum(ALLOWED_UPLOAD_CONTENT_TYPES),
    contentLength: z.number().int().min(0),
  })
  .refine((v) => v.contentLength <= getMaxUploadSizeBytes(), {
    message: "File size exceeds maximum allowed",
    path: ["contentLength"],
  });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to upload files" },
      { status: 401 }
    );
  }

  try {
    const body = Schema.parse(await request.json());
    const result = await presignUpload({
      userId: session.user.id,
      kind: body.kind,
      integrationSetId: body.integrationSetId,
      postId: body.postId,
      relativePath: body.relativePath,
      contentType: body.contentType,
      contentLength: body.contentLength,
    });
    if (!result) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid upload target or path" },
        { status: 400 }
      );
    }
    return NextResponse.json(result, { status: 201 });
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
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Failed to presign upload" },
      { status: 500 }
    );
  }
}
