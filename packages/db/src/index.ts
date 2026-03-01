import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Local dev: static DATABASE_URL, singleton (unchanged from prior behavior)
// ---------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  vercelPrisma?: PrismaClient;
  vercelTokenExpiresAt?: number;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ---------------------------------------------------------------------------
// Vercel (deployed): IAM auth via OIDC → RDS Signer → dynamic DATABASE_URL
// ---------------------------------------------------------------------------
const TOKEN_TTL_MS = 14 * 60 * 1000; // refresh 1 min before 15-min expiry

async function createVercelPrisma(): Promise<PrismaClient> {
  const now = Date.now();
  if (
    globalForPrisma.vercelPrisma &&
    globalForPrisma.vercelTokenExpiresAt &&
    now < globalForPrisma.vercelTokenExpiresAt
  ) {
    return globalForPrisma.vercelPrisma;
  }

  const { awsCredentialsProvider } = await import(
    "@vercel/oidc-aws-credentials-provider"
  );
  const { Signer } = await import("@aws-sdk/rds-signer");

  const hostname = process.env.DB_HOST!;
  const port = Number(process.env.DB_PORT ?? 5432);
  const username = process.env.DB_USER ?? "app_user";
  const database = process.env.DB_NAME ?? "lumigraph_db";
  const region = process.env.AWS_REGION!;

  const signer = new Signer({
    credentials: awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
    }),
    hostname,
    port,
    username,
    region,
  });

  const token = await signer.getAuthToken();
  const encoded = encodeURIComponent(token);
  const url = `postgresql://${username}:${encoded}@${hostname}:${port}/${database}?sslmode=require`;

  if (globalForPrisma.vercelPrisma) {
    await globalForPrisma.vercelPrisma.$disconnect();
  }

  const client = new PrismaClient({
    datasources: { db: { url } },
    log: ["warn", "error"],
  });

  globalForPrisma.vercelPrisma = client;
  globalForPrisma.vercelTokenExpiresAt = now + TOKEN_TTL_MS;

  return client;
}

/**
 * Returns a PrismaClient appropriate for the current environment.
 *
 * - Local dev: returns the singleton `prisma` (uses DATABASE_URL)
 * - Vercel: generates an IAM auth token via OIDC, caches the client for ~14 min
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (process.env.VERCEL && process.env.DB_HOST) {
    return createVercelPrisma();
  }
  return prisma;
}

export type { Prisma } from "@prisma/client";
