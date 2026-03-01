import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken } from "../../../../src/server/password-reset";

const ResetPasswordBodySchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Reset-password: verify token and set new password. Token is invalidated after use.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof ResetPasswordBodySchema>;
  try {
    const raw = await request.json();
    body = ResetPasswordBodySchema.parse(raw);
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

  const result = await resetPasswordWithToken(body.token, body.password);

  if (result === "invalid_token" || result === "expired") {
    return NextResponse.json(
      {
        code: "INVALID_OR_EXPIRED",
        message:
          "This reset link is invalid or has expired. Please request a new one.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    message: "Password updated. You can sign in now.",
  });
}
