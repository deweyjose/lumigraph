import { NextResponse } from "next/server";
import { listPublicPosts } from "@/server/services/posts";

export async function GET() {
  const posts = await listPublicPosts({ limit: 50 });
  return NextResponse.json(posts);
}
