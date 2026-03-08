import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import {
  getWorkflowSessionForOwner,
  listWorkflowRunsForOwner,
} from "@/server/services/workflow-runs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to view workflow sessions");
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const workflowSession = await getWorkflowSessionForOwner(
    session.user.id,
    parsedParams.data.id
  );
  if (!workflowSession) {
    return apiError(
      404,
      "NOT_FOUND",
      "Workflow session not found or you do not own it"
    );
  }

  const runs = await listWorkflowRunsForOwner(session.user.id, {
    sessionId: workflowSession.id,
  });
  return NextResponse.json({ session: workflowSession, runs });
}
