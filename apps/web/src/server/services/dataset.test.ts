import { describe, it, expect, vi, beforeEach } from "vitest";
import * as datasetService from "./dataset";
import type { PrismaClient } from "@prisma/client";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");

describe("datasetService", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("create obtains prisma, creates dataset with userId and returns result", async () => {
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
    const mockCreate = vi.fn().mockResolvedValue(created);
    const prisma = {
      dataset: { create: mockCreate },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await datasetService.create("user-1", {
      title: "My Dataset",
    });

    expect(getPrisma).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        title: "My Dataset",
        user: { connect: { id: "user-1" } },
      },
    });
    expect(result).toEqual(created);
  });

  it("update returns null when dataset not found", async () => {
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await datasetService.update("user-1", "ds-1", {
      title: "Updated",
    });

    expect(result).toBeNull();
  });

  it("update returns null when dataset belongs to another user", async () => {
    const mockUpdate = vi.fn();
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ds-1",
          userId: "other-user",
          imagePostId: null,
          title: "T",
          description: null,
          visibility: "PRIVATE",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        update: mockUpdate,
      },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await datasetService.update("user-1", "ds-1", {
      title: "Updated",
    });

    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
