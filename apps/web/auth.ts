import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import authConfig from "./auth.config";
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
