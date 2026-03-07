import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyDownloadJobCallback,
  verifyDownloadJobCallbackSignature,
} from "@/server/services/download-jobs";

const ParamsSchema = z.object({ jobId: z.string().uuid() });

const BodySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("RUNNING") }),
  z.object({
    status: z.literal("FAILED"),
    errorMessage: z.string().max(1000).optional(),
  }),
  z.object({
    status: z.literal("READY"),
    outputS3Key: z.string().min(1),
    outputSizeBytes: z.number().int().nonnegative().optional(),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const callbackSecret = process.env.DOWNLOAD_CALLBACK_SECRET;
  if (!callbackSecret) {
    return NextResponse.json(
      {
        code: "SERVER_ERROR",
        message: "DOWNLOAD_CALLBACK_SECRET is not configured",
      },
      { status: 500 }
    );
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: parsedParams.error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 }
    );
  }

  const timestamp = request.headers.get("x-lumigraph-timestamp");
  const signature = request.headers.get("x-lumigraph-signature");
  if (!timestamp || !signature) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Missing callback signature headers",
      },
      { status: 401 }
    );
  }

  const rawBody = await request.text();
  const isValid = verifyDownloadJobCallbackSignature(
    callbackSecret,
    timestamp,
    signature,
    rawBody
  );
  if (!isValid) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Invalid callback signature",
      },
      { status: 401 }
    );
  }

  let parsedBody: z.infer<typeof BodySchema>;
  try {
    parsedBody = BodySchema.parse(JSON.parse(rawBody));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid callback payload";
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message,
      },
      { status: 400 }
    );
  }

  const result = await applyDownloadJobCallback(
    parsedParams.data.jobId,
    parsedBody
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        code: "BAD_REQUEST",
        message: result.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
