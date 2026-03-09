import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import { executeWorkflowRunForOwner } from "@/server/services/workflow-orchestrator";
import { retryWorkflowRunForOwner } from "@/server/services/workflow-runs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to retry workflow runs");
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const result = await retryWorkflowRunForOwner(
    session.user.id,
    parsedParams.data.id
  );
  if (!result.ok) {
    return apiError(
      result.code === "NOT_FOUND" ? 404 : 400,
      result.code,
      result.message
    );
  }

  const execution = await executeWorkflowRunForOwner(
    session.user.id,
    result.run.id,
    {
      sourceRunId: parsedParams.data.id,
    }
  );
  if (!execution.ok) {
    return apiError(400, execution.code, execution.message);
  }

  return NextResponse.json({ run: execution.run }, { status: 202 });
}
