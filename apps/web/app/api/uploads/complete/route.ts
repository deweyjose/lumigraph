import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { completeUpload } from "@/server/services/uploads";

const Schema = z.object({
  assetId: z.string().uuid(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().max(256).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to complete uploads" },
      { status: 401 }
    );
  }
  try {
    const body = Schema.parse(await request.json());
    const asset = await completeUpload(
      session.user.id,
      body.assetId,
      BigInt(body.sizeBytes),
      body.checksum ?? null
    );
    if (!asset) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Asset not found or upload cannot be completed",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        id: asset.id,
        status: asset.status,
        sizeBytes: Number(asset.sizeBytes),
      },
      { status: 200 }
    );
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
      { code: "SERVER_ERROR", message: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
