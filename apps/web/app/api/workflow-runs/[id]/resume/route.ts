import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import { resumeWorkflowRunForOwner } from "@/server/services/workflow-runs";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to resume workflow runs");
  }

  const parsedParams = ParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const result = await resumeWorkflowRunForOwner(
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

  return NextResponse.json({ run: result.run }, { status: 202 });
}
