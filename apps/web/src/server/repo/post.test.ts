import { describe, it, expect, vi } from "vitest";
import * as postRepo from "./post";
import type { PrismaClient } from "@prisma/client";

describe("postRepo", () => {
  it("create calls prisma.imagePost.create with data and returns result", async () => {
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
    const prisma = {
      imagePost: {
        create: vi.fn().mockResolvedValue(created),
      },
    } as unknown as PrismaClient;

    const result = await postRepo.create(prisma, {
      slug: "my-slug",
      title: "My Post",
      user: { connect: { id: "user-1" } },
    });

    expect(prisma.imagePost.create).toHaveBeenCalledWith({
      data: {
        slug: "my-slug",
        title: "My Post",
        user: { connect: { id: "user-1" } },
      },
    });
    expect(result).toEqual(created);
  });

  it("findById calls prisma.imagePost.findUnique with id", async () => {
    const post = {
      id: "post-1",
      userId: "user-1",
      slug: "slug",
      title: "Title",
      description: null,
      visibility: "DRAFT" as const,
      targetName: null,
      targetType: null,
      captureDate: null,
      bortle: null,
      finalImageUrl: null,
      finalImageThumbUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      imagePost: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    } as unknown as PrismaClient;

    const result = await postRepo.findById(prisma, "post-1");

    expect(prisma.imagePost.findUnique).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
    expect(result).toEqual(post);
  });
});
