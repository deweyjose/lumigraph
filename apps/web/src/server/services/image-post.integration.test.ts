import { describe, it, expect, afterEach } from "vitest";
import { getPrisma } from "@lumigraph/db";
import { registerWithPassword } from "./user";
import { createDraft, updateDraft } from "./image-post";

describe("image-post service (integration)", () => {
  const unique = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `${unique}@example.com`;
  let userId: string;

  afterEach(async () => {
    const prisma = await getPrisma();
    if (userId) {
      await prisma.imagePost.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("createDraft creates a post and updateDraft updates it", async () => {
    const reg = await registerWithPassword(email, "password123", "Test");
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    userId = reg.userId;

    const slug = `integration-${unique}`;
    const created = await createDraft(userId, {
      title: "Integration Post",
      slug,
      visibility: "DRAFT",
    });
    expect(created).not.toBeNull();
    expect(created?.slug).toBe(slug);
    expect(created?.title).toBe("Integration Post");
    expect(created?.userId).toBe(userId);

    const prisma = await getPrisma();
    const found = await prisma.imagePost.findUnique({
      where: { id: created!.id },
    });
    expect(found?.title).toBe("Integration Post");

    const updated = await updateDraft(userId, created!.id, {
      title: "Updated Title",
    });
    expect(updated?.title).toBe("Updated Title");

    const foundAfter = await prisma.imagePost.findUnique({
      where: { id: created!.id },
    });
    expect(foundAfter?.title).toBe("Updated Title");
  });

  it("createDraft throws when slug is duplicate for same user", async () => {
    const reg = await registerWithPassword(email, "password123", "Test");
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    userId = reg.userId;

    const slug = `dup-slug-${unique}`;
    const first = await createDraft(userId, {
      title: "First",
      slug,
      visibility: "DRAFT",
    });
    expect(first).not.toBeNull();

    await expect(
      createDraft(userId, { title: "Second", slug, visibility: "DRAFT" })
    ).rejects.toThrow();
  });
});
