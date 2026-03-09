import { z } from "zod";
import { auth } from "auth";
import { NextResponse } from "next/server";
import { apiError, apiValidationError } from "@/server/api-responses";
import { executeWorkflowRunForOwner } from "@/server/services/workflow-orchestrator";
import { launchWorkflowSessionFromDefinitionForOwner } from "@/server/services/workflow-runs";
import { WorkflowDefinitionParamsSchema } from "../../schema";

const LaunchWorkflowSchema = z
  .object({
    subjectType: z.enum(["POST", "INTEGRATION_SET"]).optional(),
    subjectId: z.string().uuid().optional(),
    goal: z.string().max(10_000).optional().nullable(),
    agentKind: z.string().max(255).optional(),
    model: z.string().max(255).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasSubjectType = value.subjectType !== undefined;
    const hasSubjectId = value.subjectId !== undefined;
    if (hasSubjectType !== hasSubjectId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "subjectType and subjectId must be provided together",
      });
    }
  });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "Sign in to launch a workflow definition"
    );
  }

  const parsedParams = WorkflowDefinitionParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const parsedBody = LaunchWorkflowSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error);
  }

  const result = await launchWorkflowSessionFromDefinitionForOwner(
    session.user.id,
    {
      definitionId: parsedParams.data.id,
      subject:
        parsedBody.data.subjectType && parsedBody.data.subjectId
          ? {
              type: parsedBody.data.subjectType,
              id: parsedBody.data.subjectId,
            }
          : null,
      goal: parsedBody.data.goal ?? null,
      agentKind: parsedBody.data.agentKind,
      model: parsedBody.data.model ?? null,
    }
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
    result.run.id
  );
  if (!execution.ok) {
    return apiError(400, execution.code, execution.message);
  }

  return NextResponse.json(
    {
      session: result.session,
      run: execution.run,
    },
    { status: 201 }
  );
}
