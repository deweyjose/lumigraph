import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  cancelDownloadJobForOwner,
  deleteDownloadJobForOwner,
  getDownloadJobStatusForOwner,
} from "@/server/services/download-jobs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to view export jobs" },
      { status: 401 }
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

  const result = await getDownloadJobStatusForOwner(
    parsedParams.data.id,
    parsedParams.data.jobId,
    session.user.id
  );

  if (!result.ok) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: result.message,
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ job: result.job }, { status: 200 });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to manage export jobs" },
      { status: 401 }
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

  const result = await cancelDownloadJobForOwner(
    parsedParams.data.id,
    parsedParams.data.jobId,
    session.user.id
  );

  if (!result.ok) {
    const code = result.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST";
    const status = result.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json(
      {
        code,
        message: result.message,
      },
      { status }
    );
  }

  return NextResponse.json({ job: result.job }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to manage export jobs" },
      { status: 401 }
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

  const result = await deleteDownloadJobForOwner(
    parsedParams.data.id,
    parsedParams.data.jobId,
    session.user.id
  );

  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json(
        { code: "NOT_FOUND", message: result.message },
        { status: 404 }
      );
    }
    if (result.code === "INVALID_STATE") {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: result.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "SERVER_ERROR", message: result.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
