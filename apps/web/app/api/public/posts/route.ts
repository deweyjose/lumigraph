import { NextResponse } from "next/server";
import { toJsonSafe } from "@/server/json";
import { listPublicPosts } from "@/server/services/posts";

export async function GET() {
  const posts = await listPublicPosts({ limit: 50 });
  return NextResponse.json(toJsonSafe(posts));
}
