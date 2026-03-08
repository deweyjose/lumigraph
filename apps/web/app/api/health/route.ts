import { NextResponse } from "next/server";
import { getPrisma } from "@lumigraph/db";
import { apiError } from "@/server/api-responses";

export const dynamic = "force-dynamic";

export async function GET() {
  const debug: Record<string, string | boolean | undefined> = {
    VERCEL: !!process.env.VERCEL,
    DB_HOST: process.env.DB_HOST ?? "(unset)",
    DB_PORT: process.env.DB_PORT ?? "(unset)",
    DB_NAME: process.env.DB_NAME ?? "(unset)",
    DB_USER: process.env.DB_USER ?? "(unset)",
    AWS_REGION: process.env.AWS_REGION ?? "(unset)",
    AWS_ROLE_ARN: process.env.AWS_ROLE_ARN ? "(set)" : "(unset)",
    DATABASE_URL: process.env.DATABASE_URL ? "(set)" : "(unset)",
  };

  try {
    const prisma = await getPrisma();
    const userCount = await prisma.user.count();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      userCount,
      timestamp: new Date().toISOString(),
      debug,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(503, "SERVICE_UNAVAILABLE", message, {
      status: "error",
      db: "disconnected",
      debug,
    });
  }
}
