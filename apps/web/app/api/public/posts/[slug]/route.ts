import { NextResponse } from "next/server";
import { getPostBySlugForView } from "@/server/services/posts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPostBySlugForView(slug, null);
  if (!post || post.status !== "PUBLISHED") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Post not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(post);
}
