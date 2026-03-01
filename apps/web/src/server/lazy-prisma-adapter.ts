import type { Adapter } from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@lumigraph/db";

const ADAPTER_METHODS = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "createVerificationToken",
  "useVerificationToken",
] as const;

/**
 * Returns an Auth.js adapter that resolves Prisma via getPrisma() on each call.
 * Required because we use async getPrisma() (IAM auth on Vercel) and NextAuth()
 * expects a sync adapter at config time.
 */
export function createLazyPrismaAdapter(): Adapter {
  const handler = {
    get(_target: Adapter, prop: string) {
      if (ADAPTER_METHODS.includes(prop as (typeof ADAPTER_METHODS)[number])) {
        return async (...args: unknown[]) => {
          const prisma = await getPrisma();
          const adapter = PrismaAdapter(prisma) as Record<string, (...a: unknown[]) => unknown>;
          const fn = adapter[prop];
          if (typeof fn !== "function") return undefined;
          return fn.apply(adapter, args);
        };
      }
      return undefined;
    },
  };
  return new Proxy({} as Adapter, handler);
}
