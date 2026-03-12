import { NextResponse } from "next/server";
import { getAstroHubHeroSource } from "@/server/services/astro-sources/hero";

export async function GET() {
  const payload = await getAstroHubHeroSource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
