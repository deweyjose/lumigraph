import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "../../../../src/server/auth";

async function handler(
  req: NextRequest,
  ctx: { params: { nextauth: string[] } }
) {
  const options = await getAuthOptions();
  return NextAuth(req, ctx, options);
}

export { handler as GET, handler as POST };
