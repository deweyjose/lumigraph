import { NextResponse } from "next/server";
import { getAstroHubIssSource } from "@/server/services/astro-sources/iss";

export async function GET() {
  const payload = await getAstroHubIssSource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
