import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { getPrisma } from "@lumigraph/db";

export async function getAuthOptions(): Promise<NextAuthOptions> {
  const githubId = process.env.GITHUB_ID;
  const githubSecret = process.env.GITHUB_SECRET;

  if (!githubId || !githubSecret) {
    console.warn(
      "⚠ GITHUB_ID or GITHUB_SECRET is missing — auth providers disabled"
    );
  }

  const providers =
    githubId && githubSecret
      ? [GitHubProvider({ clientId: githubId, clientSecret: githubSecret })]
      : [];

  const prisma = await getPrisma();

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "database" },
    providers,
  };
}
