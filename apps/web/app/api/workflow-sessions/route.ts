import { NextResponse } from "next/server";
import { auth } from "auth";
import { apiError } from "@/server/api-responses";
import { listWorkflowSessionsForOwner } from "@/server/services/workflow-runs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to view workflow sessions");
  }

  const sessions = await listWorkflowSessionsForOwner(session.user.id);
  return NextResponse.json({ sessions });
}
