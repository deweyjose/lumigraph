import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiValidationError, apiError } from "@/server/api-responses";
import { listWorkflowRunsForOwner } from "@/server/services/workflow-runs";

const QuerySchema = z.object({
  sessionId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to view workflow runs");
  }

  const url = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse({
    sessionId: url.searchParams.get("sessionId") ?? undefined,
  });
  if (!parsedQuery.success) {
    return apiValidationError(parsedQuery.error);
  }

  const runs = await listWorkflowRunsForOwner(session.user.id, {
    sessionId: parsedQuery.data.sessionId,
  });
  return NextResponse.json({ runs });
}
