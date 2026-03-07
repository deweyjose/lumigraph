import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  ALLOWED_UPLOAD_CONTENT_TYPES,
  getMaxUploadSizeBytes,
  presignUpload,
} from "@/server/services/uploads";

const ItemSchema = z
  .object({
    clientId: z.string().min(1).max(100),
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

const Schema = z.object({
  items: z.array(ItemSchema).min(1).max(500),
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
    const results = await Promise.all(
      body.items.map(async (item) => {
        const out = await presignUpload({
          userId: session.user.id,
          kind: item.kind,
          integrationSetId: item.integrationSetId,
          postId: item.postId,
          relativePath: item.relativePath,
          contentType: item.contentType,
          contentLength: item.contentLength,
        });
        if (!out) {
          return {
            clientId: item.clientId,
            ok: false as const,
            error: "Invalid upload target or path",
          };
        }
        return {
          clientId: item.clientId,
          ok: true as const,
          assetId: out.assetId,
          uploadUrl: out.uploadUrl,
          s3Key: out.s3Key,
        };
      })
    );
    return NextResponse.json({ results }, { status: 200 });
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
      { code: "SERVER_ERROR", message: "Failed to presign uploads" },
      { status: 500 }
    );
  }
}
