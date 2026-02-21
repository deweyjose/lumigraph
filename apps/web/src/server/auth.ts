import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@lumigraph/db";

export function getAuthOptions(): NextAuthOptions {
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

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "database" },
    providers
  };
}
