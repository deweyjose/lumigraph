import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "../../../../src/server/password-reset";
import {
  getEmailAuthUnavailableMessage,
  isEmailAuthConfigured,
} from "../../../../src/server/auth-email";

const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

/**
 * Forgot-password: send a time-limited reset link to the user's email.
 * Uses VerificationToken with identifier "password-reset:${userId}".
 * Always returns 200 to avoid leaking whether the email exists.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof ForgotPasswordBodySchema>;
  try {
    const raw = await request.json();
    body = ForgotPasswordBodySchema.parse(raw);
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

  if (!isEmailAuthConfigured()) {
    return NextResponse.json(
      {
        code: "NOT_IMPLEMENTED",
        message: getEmailAuthUnavailableMessage(),
      },
      { status: 501 }
    );
  }

  await requestPasswordReset(body.email);

  return NextResponse.json({
    message:
      "If an account exists for that email, we sent a link to reset your password.",
  });
}
