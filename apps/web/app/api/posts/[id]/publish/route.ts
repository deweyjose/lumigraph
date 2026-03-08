import { NextResponse } from "next/server";
import { auth } from "auth";
import { toJsonSafe } from "@/server/json";
import { publishPost } from "@/server/services/posts";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to publish posts" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const post = await publishPost(session.user.id, id);
  if (!post) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Post not found or you do not own it" },
      { status: 404 }
    );
  }
  return NextResponse.json(toJsonSafe(post));
}
