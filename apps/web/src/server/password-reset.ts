import { randomBytes } from "crypto";
import { getPrisma } from "@lumigraph/db";
import { hashPassword } from "./password";
import { sendMail } from "./email";

const PASSWORD_RESET_PREFIX = "password-reset:";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function baseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return "http://localhost:3000";
}

/**
 * Create a password-reset token for the user and send the reset email.
 * Uses VerificationToken with identifier "password-reset:${userId}".
 * Always returns void to prevent user enumeration — callers should show
 * the same "check your email" message regardless of whether the user exists.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const identifier = `${PASSWORD_RESET_PREFIX}${user.id}`;
  const expires = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const resetLink = `${baseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Lumigraph password",
    text: `You requested a password reset. Open this link to set a new password (valid for 1 hour):\n\n${resetLink}\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>You requested a password reset. <a href="${resetLink}">Click here to set a new password</a> (valid for 1 hour).</p><p>If you didn't request this, you can ignore this email.</p>`,
  });
}

export type ResetResult = "ok" | "invalid_token" | "expired";

/**
 * Verify the reset token and update the user's password. Deletes the token on success.
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  const prisma = await getPrisma();
  const now = new Date();

  const all = await prisma.verificationToken.findMany({
    where: { token, expires: { gt: now } },
  });
  const vt = all.find((v) => v.identifier.startsWith(PASSWORD_RESET_PREFIX));
  if (!vt) return "invalid_token";

  const userId = vt.identifier.slice(PASSWORD_RESET_PREFIX.length);
  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({
      where: {
        identifier_token: { identifier: vt.identifier, token: vt.token },
      },
    }),
  ]);

  return "ok";
}
