import { NextResponse } from "next/server";
import { auth } from "auth";
import { apiError } from "@/server/api-responses";
import { toJsonSafe } from "@/server/json";
import { getPostForOwner } from "@/server/services/posts";
import { getLatestAutoThumbJobForPostOwner } from "@/server/services/auto-thumb-jobs";
import {
  cancelAutoThumbForPostOwner,
  triggerAutoThumbForPostOwner,
} from "@/server/services/auto-thumb-runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to view thumbnail jobs");
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }

  const post = await getPostForOwner(id, session.user.id);
  if (!post) {
    return apiError(404, "NOT_FOUND", "Post not found or you do not own it");
  }

  const job = await getLatestAutoThumbJobForPostOwner(session.user.id, id);
  return NextResponse.json(toJsonSafe({ job }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to generate thumbnails");
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }

  const result = await triggerAutoThumbForPostOwner(session.user.id, id, {
    requestOrigin: new URL(request.url).origin,
  });
  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "DISPATCH_FAILED"
          ? 500
          : 409;
    return apiError(status, result.code, result.message);
  }

  return NextResponse.json(toJsonSafe({ job: result.job }), { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to cancel thumbnails");
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing post id");
  }

  const result = await cancelAutoThumbForPostOwner(session.user.id, id);
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 409;
    return apiError(status, result.code, result.message);
  }

  return NextResponse.json(toJsonSafe({ job: result.job }), { status: 200 });
}
