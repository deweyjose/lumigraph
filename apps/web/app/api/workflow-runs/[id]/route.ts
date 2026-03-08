import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import {
  getWorkflowRunForOwner,
  listRunArtifactRefsForOwner,
  listRunToolCallsForOwner,
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
    return apiError(401, "UNAUTHORIZED", "Sign in to view workflow runs");
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const run = await getWorkflowRunForOwner(
    session.user.id,
    parsedParams.data.id
  );
  if (!run) {
    return apiError(
      404,
      "NOT_FOUND",
      "Workflow run not found or you do not own it"
    );
  }

  const [toolCalls, artifactRefs] = await Promise.all([
    listRunToolCallsForOwner(session.user.id, { runId: run.id }),
    listRunArtifactRefsForOwner(session.user.id, { runId: run.id }),
  ]);

  return NextResponse.json({ run, toolCalls, artifactRefs });
}
