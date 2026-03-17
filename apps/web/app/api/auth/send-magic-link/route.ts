import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getEmailAuthUnavailableMessage,
  isEmailAuthConfigured,
} from "../../../../src/server/auth-email";
import { sendMagicLink } from "../../../../src/server/magic-link";

const SendMagicLinkBodySchema = z.object({
  email: z.string().email(),
  callbackUrl: z.string().min(1).optional(),
});

/**
 * Send a magic-link sign-in email. Creates a VerificationToken and emails the link.
 * Always returns 200 with the same message to avoid user enumeration.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof SendMagicLinkBodySchema>;
  try {
    const raw = await request.json();
    body = SendMagicLinkBodySchema.parse(raw);
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

  await sendMagicLink(body.email, body.callbackUrl);

  return NextResponse.json({
    message:
      "If an account exists for that email, we sent a sign-in link. Check your inbox.",
  });
}
