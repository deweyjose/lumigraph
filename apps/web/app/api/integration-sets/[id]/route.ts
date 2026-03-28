import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  deleteIntegrationSetForOwner,
  getIntegrationSetForOwner,
  updateIntegrationSet,
} from "@/server/services/integration-sets";

const UpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(10_000).optional().nullable(),
  postId: z.string().uuid().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to view integration sets" },
      { status: 401 }
    );
  }
  const { id } = await params;
  const set = await getIntegrationSetForOwner(id, session.user.id);
  if (!set) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration set not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(set);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to update integration sets" },
      { status: 401 }
    );
  }
  const { id } = await params;
  try {
    const body = UpdateSchema.parse(await request.json());
    const updated = await updateIntegrationSet(session.user.id, id, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(Object.prototype.hasOwnProperty.call(body, "postId") && {
        postId: body.postId,
      }),
    });
    if (!updated) {
      return NextResponse.json(
        {
          code: "NOT_FOUND",
          message: "Integration set not found, invalid post, or no permission",
        },
        { status: 404 }
      );
    }
    return NextResponse.json(updated);
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
      { code: "SERVER_ERROR", message: "Failed to update integration set" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to delete integration sets" },
      { status: 401 }
    );
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Missing integration set id" },
      { status: 400 }
    );
  }
  const result = await deleteIntegrationSetForOwner(id, session.user.id);
  if (result === "not_found") {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration set not found" },
      { status: 404 }
    );
  }
  return new NextResponse(null, { status: 204 });
}
