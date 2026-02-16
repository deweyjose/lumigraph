import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@lumigraph/db";

export function getAuthOptions(): NextAuthOptions {
  const githubId = process.env.GITHUB_ID;
  const githubSecret = process.env.GITHUB_SECRET;

  const base: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
      strategy: "database"
    },
    providers: []
  };

  if (!githubId || !githubSecret) {
    return base;
  }

  return {
    ...base,
    providers: [
      GitHubProvider({
        clientId: githubId,
        clientSecret: githubSecret
      })
    ]
  };
}
