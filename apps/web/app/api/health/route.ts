import { NextResponse } from "next/server";
import { getPrisma } from "@lumigraph/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const prisma = await getPrisma();
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { status: "error", db: "disconnected", message },
      { status: 503 }
    );
  }
}
