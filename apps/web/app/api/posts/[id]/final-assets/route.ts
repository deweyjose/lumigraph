import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  listPostFinalAssetsForOwner,
} from "@/server/services/assets";
import { setPostFinalAsset } from "@/server/services/posts";

const BodySchema = z.object({
  assetId: z.string().uuid(),
  role: z.enum(["image", "thumb"]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const assets = await listPostFinalAssetsForOwner(id, session.user.id);
  if (!assets) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Post not found or you do not own it" },
      { status: 404 }
    );
  }
  return NextResponse.json(assets);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in required" },
      { status: 401 }
    );
  }
  const { id } = await params;
  try {
    const body = BodySchema.parse(await request.json());
    const post = await setPostFinalAsset(
      session.user.id,
      id,
      body.role,
      body.assetId
    );
    if (!post) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Post or asset not found, or you do not own it",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(post);
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
      { code: "SERVER_ERROR", message: "Failed to set final asset" },
      { status: 500 }
    );
  }
}
