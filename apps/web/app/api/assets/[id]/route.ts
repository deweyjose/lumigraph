import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { apiError } from "@/server/api-responses";
import { deleteIntegrationAssetForOwner } from "@/server/services/assets";

const IdParamSchema = z.object({ id: z.string().uuid() });

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = IdParamSchema.safeParse(await params);
  if (!parsed.success) {
    return apiError(400, "BAD_REQUEST", "Invalid asset id");
  }

  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "UNAUTHORIZED", "Sign in to delete assets");
  }

  const result = await deleteIntegrationAssetForOwner(
    parsed.data.id,
    session.user.id
  );
  if (result === "not_found") {
    return apiError(404, "NOT_FOUND", "Asset not found");
  }
  if (result === "forbidden") {
    return apiError(403, "FORBIDDEN", "You cannot delete this asset");
  }

  return NextResponse.json({ ok: true });
}
