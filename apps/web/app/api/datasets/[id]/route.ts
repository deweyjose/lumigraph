import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  update,
  InvalidImagePostError,
} from "@/server/services/dataset";

const DatasetVisibility = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);
const IdParamSchema = z.object({ id: z.string().uuid() });

const UpdateDatasetBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10_000).optional().nullable(),
  visibility: DatasetVisibility.optional(),
  imagePostId: z.string().uuid().optional().nullable(),
});

export type UpdateDatasetBody = z.infer<typeof UpdateDatasetBodySchema>;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to update a dataset" },
      { status: 401 }
    );
  }

  const paramResult = IdParamSchema.safeParse(await params);
  if (!paramResult.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: paramResult.error.issues.map((e) => e.message).join("; "),
      },
      { status: 400 }
    );
  }
  const { id } = paramResult.data;

  let body: UpdateDatasetBody;
  try {
    const raw = await request.json();
    body = UpdateDatasetBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((e) => e.message).join("; ");
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "Invalid JSON" },
      { status: 400 }
    );
  }

  const updateData: Parameters<typeof update>[2] = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.visibility !== undefined) updateData.visibility = body.visibility;
  if (Object.prototype.hasOwnProperty.call(body, "imagePostId")) {
    updateData.imagePost =
      body.imagePostId != null && body.imagePostId !== ""
        ? { connect: { id: body.imagePostId } }
        : { disconnect: true };
  }

  try {
    const dataset = await update(session.user.id, id, updateData);
    if (!dataset) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Dataset not found or you do not own it" },
        { status: 404 }
      );
    }
    return NextResponse.json(dataset);
  } catch (err) {
    if (err instanceof InvalidImagePostError) {
      return NextResponse.json(
        {
          code: "BAD_REQUEST",
          message: "Image post not found or you do not own it",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Failed to update dataset" },
      { status: 500 }
    );
  }
}
