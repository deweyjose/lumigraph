import { NextResponse } from "next/server";
import { getAstroHubTelemetrySource } from "@/server/services/astro-sources/telemetry";

export async function GET() {
  const payload = await getAstroHubTelemetrySource();

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
