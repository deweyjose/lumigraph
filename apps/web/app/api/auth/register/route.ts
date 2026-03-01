import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWithPassword } from "../../../../src/server/user";

const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(255).optional(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof RegisterBodySchema>;
  try {
    const raw = await request.json();
    body = RegisterBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((e: z.ZodIssue) => e.message).join("; ");
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

  const result = await registerWithPassword(
    body.email,
    body.password,
    body.name
  );

  if (!result.ok) {
    return NextResponse.json(
      { code: "EMAIL_TAKEN", message: "An account with this email already exists." },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { id: result.userId, email: result.email },
    { status: 201 }
  );
}
