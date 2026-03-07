import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  createDownloadExportJob,
  listDownloadJobsForIntegrationSetForOwner,
} from "@/server/services/download-jobs";

const ParamsSchema = z.object({ id: z.string().uuid() });
const CreateSchema = z.object({
  selectedPaths: z.array(z.string().min(1).max(1024)).min(1).max(1000),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

  const jobs = await listDownloadJobsForIntegrationSetForOwner(
    parsedParams.data.id,
    session.user.id
  );
  if (!jobs) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration set not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ jobs }, { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to export files" },
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

  const parsedBody = CreateSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: parsedBody.error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 }
    );
  }

  const result = await createDownloadExportJob({
    userId: session.user.id,
    integrationSetId: parsedParams.data.id,
    selectedPaths: parsedBody.data.selectedPaths,
    requestOrigin: new URL(request.url).origin,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        code: "BAD_REQUEST",
        message: result.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ job: result.job }, { status: 202 });
}
