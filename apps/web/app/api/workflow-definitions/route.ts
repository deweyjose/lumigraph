import { NextResponse } from "next/server";
import { auth } from "auth";
import { apiError, apiValidationError } from "@/server/api-responses";
import {
  createWorkflowDefinitionForOwner,
  listWorkflowDefinitionsForOwner,
} from "@/server/services/workflow-definitions";
import { WorkflowDefinitionBodySchema } from "./schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "Sign in to view workflow definitions"
    );
  }

  const definitions = await listWorkflowDefinitionsForOwner(session.user.id);
  return NextResponse.json({ definitions });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(
      401,
      "UNAUTHORIZED",
      "Sign in to create a workflow definition"
    );
  }

  const parsedBody = WorkflowDefinitionBodySchema.safeParse(
    await request.json()
  );
  if (!parsedBody.success) {
    return apiValidationError(parsedBody.error);
  }

  const result = await createWorkflowDefinitionForOwner(
    session.user.id,
    parsedBody.data
  );
  if (!result.ok) {
    return apiError(400, result.code, result.message);
  }

  return NextResponse.json({ definition: result.definition }, { status: 201 });
}
