import NextAuth from "next-auth";
import { getAuthOptions } from "../../../../src/server/auth";

const handler = NextAuth(getAuthOptions());

export { handler as GET, handler as POST };
