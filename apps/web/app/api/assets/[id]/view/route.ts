import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { getAssetViewUrlForViewer } from "@/server/services/assets";

const IdParamSchema = z.object({ id: z.string().uuid() });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = IdParamSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: parsed.error.issues.map((e) => e.message).join("; "),
      },
      { status: 400 }
    );
  }
  const session = await auth();
  const url = await getAssetViewUrlForViewer(
    parsed.data.id,
    session?.user?.id ?? null
  );
  if (!url) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Asset not found or access denied" },
      { status: 404 }
    );
  }
  return NextResponse.redirect(url, { status: 302 });
}
