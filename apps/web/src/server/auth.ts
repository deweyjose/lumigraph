import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { getPrisma } from "@lumigraph/db";
import { verifyPassword } from "./password";

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const prisma = await getPrisma();

  const providers: NextAuthOptions["providers"] = [];

  const githubId = process.env.GITHUB_ID;
  const githubSecret = process.env.GITHUB_SECRET;
  if (githubId && githubSecret) {
    providers.push(
      GitHubProvider({ clientId: githubId, clientSecret: githubSecret })
    );
  }

  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleId && googleSecret) {
    providers.push(
      GoogleProvider({ clientId: googleId, clientSecret: googleSecret })
    );
  }

  const emailServer = process.env.EMAIL_SERVER;
  const emailFrom = process.env.EMAIL_FROM;
  if (emailServer && emailFrom) {
    providers.push(
      EmailProvider({ server: emailServer, from: emailFrom })
    );
  }

  providers.push(
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const prisma = await getPrisma();
        const row = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        const user = row as typeof row & { passwordHash?: string | null };
        if (!user?.passwordHash) return null;
        const valid = await verifyPassword(
          user.passwordHash,
          credentials.password
        );
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    })
  );

  if (providers.filter((p) => p.type !== "credentials").length === 0) {
    console.warn(
      "No auth providers configured — check GITHUB_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, or EMAIL_SERVER/FROM env vars"
    );
  }

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    providers,
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
      verifyRequest: "/auth/verify-request",
    },
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) {
          session.user.id = (token.id ?? token.sub) as string;
        }
        return session;
      },
    },
  };
}
