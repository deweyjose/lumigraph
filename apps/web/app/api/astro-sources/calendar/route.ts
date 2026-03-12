import { NextResponse } from "next/server";
import { getAstroHubCalendarSource } from "@/server/services/astro-sources/calendar";

export async function GET() {
  const payload = await getAstroHubCalendarSource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
