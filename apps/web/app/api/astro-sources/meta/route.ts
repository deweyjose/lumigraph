import { NextResponse } from "next/server";
import { getAstroHubMetaSource } from "@/server/services/astro-sources/meta";

export async function GET() {
  const payload = await getAstroHubMetaSource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
