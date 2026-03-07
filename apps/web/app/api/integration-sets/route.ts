import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import {
  createIntegrationSet,
  listMyIntegrationSets,
} from "@/server/services/integration-sets";

const CreateSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).optional().nullable(),
  postId: z.string().uuid().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to list integration sets" },
      { status: 401 }
    );
  }
  const sets = await listMyIntegrationSets(session.user.id);
  return NextResponse.json(sets);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to create an integration set" },
      { status: 401 }
    );
  }
  try {
    const body = CreateSchema.parse(await request.json());
    const created = await createIntegrationSet(session.user.id, {
      title: body.title,
      notes: body.notes ?? null,
      postId: body.postId ?? null,
    });
    if (!created) {
      return NextResponse.json(
        { code: "BAD_REQUEST", message: "Invalid post reference" },
        { status: 400 }
      );
    }
    return NextResponse.json(created, { status: 201 });
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
      { code: "SERVER_ERROR", message: "Failed to create integration set" },
      { status: 500 }
    );
  }
}
