import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getPrisma } from "@lumigraph/db";

type ConcreteAdapter = {
  createUser: (user: AdapterUser) => Promise<AdapterUser>;
  getUser: (id: string) => Promise<AdapterUser | null>;
  getUserByEmail: (email: string) => Promise<AdapterUser | null>;
  getUserByAccount: (
    account: Pick<AdapterAccount, "provider" | "providerAccountId">
  ) => Promise<AdapterUser | null>;
  updateUser: (
    user: Partial<AdapterUser> & Pick<AdapterUser, "id">
  ) => Promise<AdapterUser>;
  deleteUser?: (userId: string) => Promise<void>;
  linkAccount: (account: AdapterAccount) => Promise<void>;
  unlinkAccount?: (
    providerAccountId: Pick<AdapterAccount, "provider" | "providerAccountId">
  ) => Promise<void>;
  createSession: (session: AdapterSession) => Promise<AdapterSession>;
  getSessionAndUser: (
    sessionToken: string
  ) => Promise<{ session: AdapterSession; user: AdapterUser } | null>;
  updateSession?: (
    session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
  ) => Promise<AdapterSession | null | undefined>;
  deleteSession?: (sessionToken: string) => Promise<void>;
  createVerificationToken: (
    token: VerificationToken
  ) => Promise<VerificationToken>;
  useVerificationToken: (params: {
    identifier: string;
    token: string;
  }) => Promise<VerificationToken | null>;
};

async function getAdapter(): Promise<ConcreteAdapter> {
  const prisma = await getPrisma();
  return PrismaAdapter(prisma) as unknown as ConcreteAdapter;
}

/**
 * Returns an Auth.js adapter that resolves Prisma via getPrisma() on each call.
 * Required because we use async getPrisma() (IAM auth on Vercel) and NextAuth()
 * expects a sync adapter at config time.
 */
export function createLazyPrismaAdapter(): Adapter {
  return {
    async createUser(user): Promise<AdapterUser> {
      const adapter = await getAdapter();
      return adapter.createUser(user);
    },
    async getUser(id): Promise<AdapterUser | null> {
      const adapter = await getAdapter();
      return adapter.getUser(id);
    },
    async getUserByEmail(email): Promise<AdapterUser | null> {
      const adapter = await getAdapter();
      return adapter.getUserByEmail(email);
    },
    async getUserByAccount(account): Promise<AdapterUser | null> {
      const adapter = await getAdapter();
      return adapter.getUserByAccount(account);
    },
    async updateUser(user): Promise<AdapterUser> {
      const adapter = await getAdapter();
      return adapter.updateUser(user);
    },
    async deleteUser(userId): Promise<void> {
      const adapter = await getAdapter();
      await adapter.deleteUser?.(userId);
    },
    async linkAccount(account): Promise<void> {
      const adapter = await getAdapter();
      await adapter.linkAccount(account);
    },
    async unlinkAccount(providerAccountId): Promise<void> {
      const adapter = await getAdapter();
      await adapter.unlinkAccount?.(providerAccountId);
    },
    async createSession(session): Promise<AdapterSession> {
      const adapter = await getAdapter();
      return adapter.createSession(session);
    },
    async getSessionAndUser(sessionToken) {
      const adapter = await getAdapter();
      return adapter.getSessionAndUser(sessionToken);
    },
    async updateSession(session): Promise<AdapterSession | null> {
      const adapter = await getAdapter();
      return (await adapter.updateSession?.(session)) ?? null;
    },
    async deleteSession(sessionToken): Promise<void> {
      const adapter = await getAdapter();
      await adapter.deleteSession?.(sessionToken);
    },
    async createVerificationToken(token): Promise<VerificationToken> {
      const adapter = await getAdapter();
      return adapter.createVerificationToken(token);
    },
    async useVerificationToken(params): Promise<VerificationToken | null> {
      const adapter = await getAdapter();
      return adapter.useVerificationToken(params);
    },
  } satisfies Adapter;
}
