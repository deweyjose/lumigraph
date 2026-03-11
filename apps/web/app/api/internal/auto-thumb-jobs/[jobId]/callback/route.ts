import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyAutoThumbJobCallback,
  verifyAutoThumbJobCallbackSignature,
} from "@/server/services/auto-thumb-runtime";

const ParamsSchema = z.object({ jobId: z.string().uuid() });

const BodySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("RUNNING"),
  }),
  z.object({
    status: z.literal("FAILED"),
    errorMessage: z.string().max(1000).optional(),
  }),
  z.object({
    status: z.literal("READY"),
    outputThumbKey: z.string().min(1),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const callbackSecret = process.env.INTERNAL_CALLBACK_SECRET;
  if (!callbackSecret) {
    return NextResponse.json(
      {
        code: "SERVER_ERROR",
        message: "INTERNAL_CALLBACK_SECRET is not configured",
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

  const requestUrl = new URL(request.url);
  const timestamp =
    request.headers.get("x-lumigraph-timestamp") ??
    requestUrl.searchParams.get("ts");
  const signature =
    request.headers.get("x-lumigraph-signature") ??
    requestUrl.searchParams.get("sig") ??
    requestUrl.searchParams.get("signature");

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
  const isValid = verifyAutoThumbJobCallbackSignature(
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

  const result = await applyAutoThumbJobCallback(
    parsedParams.data.jobId,
    parsedBody,
    { requestOrigin: requestUrl.origin }
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
