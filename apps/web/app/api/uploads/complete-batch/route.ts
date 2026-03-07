import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { completeUpload } from "@/server/services/uploads";

const ItemSchema = z.object({
  clientId: z.string().min(1).max(100),
  assetId: z.string().uuid(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().max(256).optional().nullable(),
});

const Schema = z.object({
  items: z.array(ItemSchema).min(1).max(500),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to complete uploads" },
      { status: 401 }
    );
  }
  try {
    const body = Schema.parse(await request.json());
    const results = await Promise.all(
      body.items.map(async (item) => {
        const asset = await completeUpload(
          session.user.id,
          item.assetId,
          BigInt(item.sizeBytes),
          item.checksum ?? null
        );
        if (!asset) {
          return {
            clientId: item.clientId,
            ok: false as const,
            error: "Asset not found or upload cannot be completed",
          };
        }
        return {
          clientId: item.clientId,
          ok: true as const,
          assetId: asset.id,
          status: asset.status,
        };
      })
    );
    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: err.issues.map((i) => i.message).join("; "),
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Failed to complete uploads" },
      { status: 500 }
    );
  }
}
