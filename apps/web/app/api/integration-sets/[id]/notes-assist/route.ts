import { z } from "zod";
import { auth } from "auth";
import { hasOpenAIApiKey } from "@/server/ai/config";
import { apiError } from "@/server/api-responses";
import {
  generateIntegrationSetNotes,
  refineIntegrationSetNotes,
} from "@/server/services/integration-set-notes-assist";

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate") }),
  z.object({
    action: z.literal("refine"),
    notes: z.string().min(1).max(8000),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to use notes assist");
  }

  if (!hasOpenAIApiKey()) {
    return apiError(
      503,
      "AI_UNAVAILABLE",
      "AI notes assist is not configured on this deployment"
    );
  }

  const { id } = await params;
  if (!id) {
    return apiError(400, "BAD_REQUEST", "Missing integration set id");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "BAD_REQUEST", "Expected JSON body");
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(
      400,
      "BAD_REQUEST",
      first?.message ?? "Invalid request body"
    );
  }

  try {
    if (parsed.data.action === "refine") {
      const result = await refineIntegrationSetNotes(
        id,
        session.user.id,
        parsed.data.notes
      );
      return Response.json(result);
    }
    const result = await generateIntegrationSetNotes(id, session.user.id);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found")) {
      return apiError(404, "NOT_FOUND", "Integration set not found");
    }
    return apiError(502, "AI_GENERATION_FAILED", "Failed to generate notes");
  }
}
