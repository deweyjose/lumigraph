import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  create,
  listMyDatasets,
  InvalidImagePostError,
} from "@/server/services/dataset";

const DatasetVisibility = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);

const CreateDatasetBodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).optional().nullable(),
  visibility: DatasetVisibility.optional(),
  imagePostId: z.string().uuid().optional().nullable(),
});

export type CreateDatasetBody = z.infer<typeof CreateDatasetBodySchema>;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to list your datasets" },
      { status: 401 }
    );
  }
  const datasets = await listMyDatasets(session.user.id);
  return NextResponse.json(datasets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to create a dataset" },
      { status: 401 }
    );
  }

  let body: CreateDatasetBody;
  try {
    const raw = await request.json();
    body = CreateDatasetBodySchema.parse(raw);
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

  try {
    const dataset = await create(session.user.id, {
      title: body.title,
      ...(body.description != null && { description: body.description }),
      ...(body.visibility != null && { visibility: body.visibility }),
      ...(body.imagePostId != null &&
        body.imagePostId !== "" && { imagePostId: body.imagePostId }),
    });
    return NextResponse.json(dataset, { status: 201 });
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
      { code: "SERVER_ERROR", message: "Failed to create dataset" },
      { status: 500 }
    );
  }
}
