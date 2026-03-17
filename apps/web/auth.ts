import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import nodemailer from "nodemailer";
import authConfig from "./auth.config";
import { resolveRecipient } from "./src/server/email";
import { createLazyPrismaAdapter } from "./src/server/lazy-prisma-adapter";
import { verifyPassword } from "./src/server/password";

const providers = [
  ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
    ? [GitHub]
    : []),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [Google]
    : []),
  ...(process.env.EMAIL_SERVER && process.env.EMAIL_FROM
    ? [
        Nodemailer({
          server: process.env.EMAIL_SERVER,
          from: process.env.EMAIL_FROM,
          async sendVerificationRequest({ identifier, provider, url }) {
            const transport = nodemailer.createTransport(provider.server);
            const to = resolveRecipient(identifier);
            const host = new URL(url).host;
            const escapedHost = host.replace(/\./g, "&#8203;.");
            const escapedEmail = to.replace(/\./g, "&#8203;.");
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
            await transport.sendMail({
              to,
              from: provider.from,
              subject,
              text,
              html,
            });
          },
        }),
      ]
    : []),
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      const { getPrisma } = await import("@lumigraph/db");
      const prisma = await getPrisma();
      const row = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });
      const user = row as typeof row & { passwordHash?: string | null };
      if (!user?.passwordHash) return null;
      const valid = await verifyPassword(
        user.passwordHash,
        credentials.password as string
      );
      if (!valid) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
      };
    },
  }),
];

const hasOAuthOrEmail =
  (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) ||
  (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) ||
  (process.env.EMAIL_SERVER && process.env.EMAIL_FROM);

if (!hasOAuthOrEmail) {
  console.warn(
    "No OAuth/email providers configured — set AUTH_GITHUB_ID/SECRET, AUTH_GOOGLE_ID/SECRET, or EMAIL_SERVER/FROM"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: createLazyPrismaAdapter(),
  providers,
  session: { strategy: "jwt" },
});
