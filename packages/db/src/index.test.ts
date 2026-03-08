import { describe, it, expect, beforeEach } from "vitest";
import { getPrisma, prisma } from "./index";

describe("@lumigraph/db", () => {
  beforeEach(() => {
    // Ensure we use the local prisma path (no Vercel IAM)
    delete process.env.VERCEL;
    delete process.env.DB_HOST;
  });

  it("exports getPrisma as a function", () => {
    expect(typeof getPrisma).toBe("function");
  });

  it("exports prisma as an object", () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma).toBe("object");
  });

  it("getPrisma() resolves to the same prisma singleton when not on Vercel", async () => {
    const client = await getPrisma();
    expect(client).toBe(prisma);
  });

  it("getPrisma() returns an object with PrismaClient-like shape", async () => {
    const client = await getPrisma();
    expect(client).toHaveProperty("$connect");
    expect(client).toHaveProperty("$disconnect");
    expect(client).toHaveProperty("user");
    expect(client).toHaveProperty("post");
    expect(client).toHaveProperty("integrationSet");
    expect(client).toHaveProperty("asset");
    expect(client).toHaveProperty("workflowSession");
    expect(client).toHaveProperty("workflowRun");
  });
});
