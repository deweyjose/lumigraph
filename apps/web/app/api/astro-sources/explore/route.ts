import { NextResponse } from "next/server";
import { getAstroHubExploreSource } from "@/server/services/astro-sources/explore";

export async function GET() {
  const payload = await getAstroHubExploreSource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
