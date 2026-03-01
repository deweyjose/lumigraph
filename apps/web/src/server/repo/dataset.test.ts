import { describe, it, expect, vi } from "vitest";
import * as datasetRepo from "./dataset";
import type { PrismaClient } from "@prisma/client";

describe("datasetRepo", () => {
  it("create calls prisma.dataset.create with data and returns result", async () => {
    const created = {
      id: "ds-1",
      userId: "user-1",
      imagePostId: null,
      title: "My Dataset",
      description: null,
      visibility: "PRIVATE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      dataset: {
        create: vi.fn().mockResolvedValue(created),
      },
    } as unknown as PrismaClient;

    const result = await datasetRepo.create(prisma, {
      title: "My Dataset",
      user: { connect: { id: "user-1" } },
    });

    expect(prisma.dataset.create).toHaveBeenCalledWith({
      data: {
        title: "My Dataset",
        user: { connect: { id: "user-1" } },
      },
    });
    expect(result).toEqual(created);
  });

  it("findById calls prisma.dataset.findUnique with id", async () => {
    const dataset = {
      id: "ds-1",
      userId: "user-1",
      imagePostId: null,
      title: "Dataset",
      description: null,
      visibility: "PRIVATE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue(dataset),
      },
    } as unknown as PrismaClient;

    const result = await datasetRepo.findById(prisma, "ds-1");

    expect(prisma.dataset.findUnique).toHaveBeenCalledWith({
      where: { id: "ds-1" },
    });
    expect(result).toEqual(dataset);
  });

  it("update calls prisma.dataset.update with id and data", async () => {
    const updated = {
      id: "ds-1",
      userId: "user-1",
      imagePostId: null,
      title: "Updated Title",
      description: null,
      visibility: "PRIVATE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      dataset: {
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaClient;

    const result = await datasetRepo.update(prisma, "ds-1", {
      title: "Updated Title",
    });

    expect(prisma.dataset.update).toHaveBeenCalledWith({
      where: { id: "ds-1" },
      data: { title: "Updated Title" },
    });
    expect(result).toEqual(updated);
  });
});
