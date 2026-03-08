import { NextResponse } from "next/server";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import {
  getWorkflowDefinitionForOwner,
  updateWorkflowDefinitionForOwner,
} from "@/server/services/workflow-definitions";
import {
  WorkflowDefinitionBodySchema,
  WorkflowDefinitionParamsSchema,
} from "../schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "Sign in to view a workflow definition"
    );
  }

  const parsedParams = WorkflowDefinitionParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const definition = await getWorkflowDefinitionForOwner(
    session.user.id,
    parsedParams.data.id
  );
  if (!definition) {
    return apiError(
      404,
      "NOT_FOUND",
      "Workflow definition not found or you do not own it"
    );
  }

  return NextResponse.json({ definition });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "Sign in to update a workflow definition"
    );
  }

  const parsedParams = WorkflowDefinitionParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return apiValidationError(parsedParams.error);
  }

  const parsedBody = WorkflowDefinitionBodySchema.safeParse(
    await request.json()
  );
  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error);
  }

  const result = await updateWorkflowDefinitionForOwner(
    session.user.id,
    parsedParams.data.id,
    parsedBody.data
  );
  if (!result.ok) {
    return apiError(
      result.code === "NOT_FOUND" ? 404 : 400,
      result.code,
      result.message
    );
  }

  return NextResponse.json({ definition: result.definition });
}
