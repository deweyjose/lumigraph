import { describe, it, expect, afterEach } from "vitest";
import { getPrisma } from "@lumigraph/db";
import { registerWithPassword } from "./user";

describe("registerWithPassword (integration)", () => {
  const uniqueEmail = `integration-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`;

  afterEach(async () => {
    const prisma = await getPrisma();
    await prisma.user.deleteMany({ where: { email: uniqueEmail } });
  });

  it("creates a user with email and password and returns userId", async () => {
    const result = await registerWithPassword(uniqueEmail, "password123", "Test User");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBeDefined();
    expect(result.email).toBe(uniqueEmail);

    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(user).not.toBeNull();
    expect(user?.email).toBe(uniqueEmail);
    expect(user?.name).toBe("Test User");
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe("password123");
  });
});
