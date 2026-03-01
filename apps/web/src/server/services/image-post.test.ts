import { describe, it, expect, vi, beforeEach } from "vitest";
import * as imagePostService from "./image-post";
import type { PrismaClient } from "@prisma/client";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");

describe("imagePostService", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("createDraft obtains prisma, creates post with userId and returns result", async () => {
    const created = {
      id: "post-1",
      userId: "user-1",
      slug: "my-slug",
      title: "My Post",
      description: null,
      visibility: "DRAFT",
      targetName: null,
      targetType: null,
      captureDate: null,
      bortle: null,
      finalImageUrl: null,
      finalImageThumbUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const mockCreate = vi.fn().mockResolvedValue(created);
    const prisma = {
      imagePost: { create: mockCreate },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await imagePostService.createDraft("user-1", {
      slug: "my-slug",
      title: "My Post",
    });

    expect(getPrisma).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        slug: "my-slug",
        title: "My Post",
        user: { connect: { id: "user-1" } },
      },
    });
    expect(result).toEqual(created);
  });

  it("updateDraft returns null when post not found", async () => {
    const prisma = {
      imagePost: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await imagePostService.updateDraft("user-1", "post-1", {
      title: "Updated",
    });

    expect(result).toBeNull();
  });

  it("updateDraft returns null when post belongs to another user", async () => {
    const mockUpdate = vi.fn();
    const prisma = {
      imagePost: {
        findUnique: vi.fn().mockResolvedValue({
          id: "post-1",
          userId: "other-user",
          slug: "s",
          title: "T",
          description: null,
          visibility: "DRAFT",
          targetName: null,
          targetType: null,
          captureDate: null,
          bortle: null,
          finalImageUrl: null,
          finalImageThumbUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: mockUpdate,
      },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await imagePostService.updateDraft("user-1", "post-1", {
      title: "Updated",
    });

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
