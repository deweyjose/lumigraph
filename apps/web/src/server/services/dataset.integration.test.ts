import { describe, it, expect, afterEach } from "vitest";
import { getPrisma } from "@lumigraph/db";
import { registerWithPassword } from "./user";
import * as datasetService from "./dataset";

describe("dataset service (integration)", () => {
  const unique = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `${unique}@example.com`;
  let userId: string;

  afterEach(async () => {
    const prisma = await getPrisma();
    if (userId) {
      await prisma.dataset.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("create adds a dataset and update modifies it", async () => {
    const reg = await registerWithPassword(email, "password123", "Test");
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    userId = reg.userId;

    const created = await datasetService.create(userId, {
      title: "Integration Dataset",
      visibility: "PRIVATE",
    });
    expect(created).not.toBeNull();
    expect(created?.title).toBe("Integration Dataset");
    expect(created?.userId).toBe(userId);

    const prisma = await getPrisma();
    const found = await prisma.dataset.findUnique({ where: { id: created!.id } });
    expect(found?.title).toBe("Integration Dataset");

    const updated = await datasetService.update(userId, created!.id, {
      title: "Updated Dataset Title",
    });
    expect(updated?.title).toBe("Updated Dataset Title");

    const foundAfter = await prisma.dataset.findUnique({ where: { id: created!.id } });
    expect(foundAfter?.title).toBe("Updated Dataset Title");
  });
});
