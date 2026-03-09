import { NextResponse } from "next/server";
import { z } from "zod";
import { runAutoThumbWorkerBatch } from "@/server/services/auto-thumb-worker";

const BodySchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  maxAttempts: z.number().int().positive().max(50).optional(),
});

export async function POST(request: Request) {
  const workerSecret = process.env.AUTO_THUMB_WORKER_SECRET;
  if (!workerSecret) {
    return NextResponse.json(
      {
        code: "SERVER_ERROR",
        message: "AUTO_THUMB_WORKER_SECRET is not configured",
      },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get("x-lumigraph-worker-secret");
  if (!providedSecret || providedSecret !== workerSecret) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Invalid worker secret" },
      { status: 401 }
    );
  }

  let parsedBody: z.infer<typeof BodySchema> = {};
  try {
    const rawBody = await request.text();
    if (rawBody.trim().length > 0) {
      const candidate = JSON.parse(rawBody) as unknown;
      const validation = BodySchema.safeParse(candidate);
      if (!validation.success) {
        return NextResponse.json(
          {
            code: "VALIDATION_ERROR",
            message: validation.error.issues.map((i) => i.message).join("; "),
          },
          { status: 400 }
        );
      }
      parsedBody = validation.data;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid JSON payload";
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message },
      { status: 400 }
    );
  }

  try {
    const result = await runAutoThumbWorkerBatch(parsedBody);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run auto-thumb worker";
    return NextResponse.json(
      { code: "SERVER_ERROR", message },
      { status: 500 }
    );
  }
}
