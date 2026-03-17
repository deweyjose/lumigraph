import { randomBytes } from "crypto";
import { getPrisma } from "@lumigraph/db";
import { sendMail } from "./email";

const MAGIC_LINK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Prefix used by password-reset; magic-link tokens use raw email as identifier. */
const PASSWORD_RESET_PREFIX = "password-reset:";

function baseUrl(): string {
  const url = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL;
  if (url) {
    return url.startsWith("http") ? url : `https://${url}`;
  }
  return "http://localhost:3000";
}

/**
 * Create a magic-link verification token and send the sign-in email.
 * Uses VerificationToken with identifier = email. Caller should show the same
 * "check your email" message regardless of result to avoid user enumeration.
 */
export async function sendMagicLink(
  email: string,
  callbackUrl?: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const prisma = await getPrisma();

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + MAGIC_LINK_EXPIRY_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalized },
  });
  await prisma.verificationToken.create({
    data: { identifier: normalized, token, expires },
  });

  const params = new URLSearchParams({ token });
  if (callbackUrl) {
    const fullCallback = callbackUrl.startsWith("http")
      ? callbackUrl
      : `${baseUrl()}${callbackUrl.startsWith("/") ? "" : "/"}${callbackUrl}`;
    params.set("callbackUrl", fullCallback);
  }
  const url = `${baseUrl()}/auth/verify-magic?${params.toString()}`;

  const subject = "Sign in to Lumigraph";
  const text = `Sign in to Lumigraph. Open this link to sign in (valid for 24 hours):\n\n${url}\n\nIf you didn't request this, you can ignore this email.`;
  const html = `<p>Sign in to Lumigraph. <a href="${url}">Click here to sign in</a> (valid for 24 hours).</p><p>If you didn't request this, you can ignore this email.</p>`;

  return sendMail({
    to: normalized,
    subject,
    text,
    html,
  });
}

/**
 * Consume a magic-link token: verify it, get or create user by email, delete token.
 * Returns the user for NextAuth or null if invalid/expired.
 * Only consumes tokens whose identifier is not password-reset (so we don't eat reset tokens).
 */
export async function consumeMagicLinkToken(token: string): Promise<{
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
} | null> {
  const prisma = await getPrisma();
  const now = new Date();

  const vt = await prisma.verificationToken.findFirst({
    where: {
      token,
      expires: { gt: now },
      identifier: { not: { startsWith: PASSWORD_RESET_PREFIX } },
    },
  });
  if (!vt) return null;

  const email = vt.identifier;

  await prisma.verificationToken.delete({
    where: {
      identifier_token: { identifier: vt.identifier, token: vt.token },
    },
  });

  let user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        emailVerified: now,
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
  };
}
