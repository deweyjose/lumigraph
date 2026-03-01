import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { getPrisma } from "@lumigraph/db";

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

  if (providers.length === 0) {
    console.warn(
      "No auth providers configured — check GITHUB_ID/SECRET, GOOGLE_CLIENT_ID/SECRET, or EMAIL_SERVER/FROM env vars"
    );
  }

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "database" },
    providers,
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
      verifyRequest: "/auth/verify-request",
    },
    callbacks: {
      session({ session, user }) {
        if (session.user) {
          session.user.id = user.id;
        }
        return session;
      },
    },
  };
}
