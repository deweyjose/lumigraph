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

  const host = baseUrl().replace(/^https?:\/\//, "");
  const escapedHost = host.replace(/\./g, "&#8203;.");
  const escapedEmail = normalized.replace(/\./g, "&#8203;.");
  const subject = `Sign in to ${host}`;
  const text = `Sign in to ${host}\n${url}\n\n`;
  const html = `
    <body style="background: #0f172a; margin: 0; padding: 24px;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0"
        style="max-width: 600px; margin: auto; border-radius: 16px; background: #111827; color: #e5e7eb; font-family: Helvetica, Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 32px 24px 12px; font-size: 24px; font-weight: 600;">
            Sign in to ${escapedHost}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 12px 24px 24px;">
            <a href="${url}" style="font-size: 16px; color: #0f172a; text-decoration: none; border-radius: 10px; padding: 12px 20px; background: #67e8f9; display: inline-block; font-weight: 700;">
              Sign in
            </a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 12px; font-size: 14px; line-height: 1.6; color: #94a3b8;">
            If you did not request this email, you can safely ignore it.
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0 24px 32px; font-size: 12px; color: #64748b;">
            ${escapedEmail}
          </td>
        </tr>
      </table>
    </body>
  `;

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
