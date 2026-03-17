import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { normalizeCallbackUrl } from "./src/server/auth-callback";

/**
 * Edge-safe auth config (no adapter, no Credentials). Used by proxy.ts.
 * Full config with adapter + Credentials + magic-link lives in auth.ts.
 */
export default {
  providers: [
    ...(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
      ? [GitHub]
      : []),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google]
      : []),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      const normalized = normalizeCallbackUrl(url, baseUrl);
      return new URL(normalized, baseUrl).toString();
    },
  },
} satisfies NextAuthConfig;
