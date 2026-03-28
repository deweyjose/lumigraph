import { z } from "zod";
import { auth } from "auth";
import { apiError } from "@/server/api-responses";
import { deleteIntegrationAssetsUnderPathForOwner } from "@/server/services/assets";

const BodySchema = z.object({
  path: z.string().min(1).max(2048),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to delete files");
  }

  const { id: integrationSetId } = await params;
  if (!integrationSetId) {
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
    return apiError(400, "BAD_REQUEST", "Invalid path");
  }

  const result = await deleteIntegrationAssetsUnderPathForOwner(
    integrationSetId,
    session.user.id,
    parsed.data.path
  );

  if (result === "not_found") {
    return apiError(404, "NOT_FOUND", "Integration set not found");
  }
  if (result === "forbidden") {
    return apiError(
      403,
      "FORBIDDEN",
      "Cannot delete: one or more files are in use"
    );
  }
  if (result === "bad_request") {
    return apiError(400, "BAD_REQUEST", "Invalid folder path");
  }

  return Response.json({ deletedCount: result.deletedCount });
}
