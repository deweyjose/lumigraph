import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "./auth.config";
import { normalizeCallbackUrl } from "./src/server/auth-callback";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isProtected =
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/posts") ||
    req.nextUrl.pathname.startsWith("/drafts");
  if (isProtected && !req.auth) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set(
      "callbackUrl",
      normalizeCallbackUrl(req.nextUrl.href, req.nextUrl.origin)
    );
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/posts/:path*", "/drafts", "/drafts/:path*"],
};
