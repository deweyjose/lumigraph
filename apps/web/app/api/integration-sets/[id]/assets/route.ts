import { NextResponse } from "next/server";
import { auth } from "auth";
import { listAssetsByIntegrationSetForOwner } from "@/server/services/assets";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to view assets" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const assets = await listAssetsByIntegrationSetForOwner(id, session.user.id);
  if (!assets) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration set not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(
    assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      relativePath: asset.relativePath,
      filename: asset.filename,
      sizeBytes: Number(asset.sizeBytes),
      contentType: asset.contentType,
      createdAt: asset.createdAt.toISOString(),
    }))
  );
}
