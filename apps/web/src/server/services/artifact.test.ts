import { describe, it, expect, vi, beforeEach } from "vitest";
import * as artifactService from "./artifact";
import type { PrismaClient } from "@prisma/client";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

const { getPrisma } = await import("@lumigraph/db");

describe("artifactService", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
  });

  it("registerArtifact obtains prisma, verifies dataset ownership, creates artifact", async () => {
    const created = {
      id: "art-1",
      datasetId: "ds-1",
      filename: "file.fits",
      fileType: "application/fits",
      s3Key: "key",
      sizeBytes: BigInt(1024),
      checksum: null,
      createdAt: new Date(),
    };
    const mockCreate = vi.fn().mockResolvedValue(created);
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ds-1",
          userId: "user-1",
          imagePostId: null,
          title: "D",
          description: null,
          visibility: "PRIVATE",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      datasetArtifact: { create: mockCreate },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await artifactService.registerArtifact(
      "ds-1",
      "user-1",
      {
        filename: "file.fits",
        fileType: "application/fits",
        s3Key: "key",
        sizeBytes: BigInt(1024),
      }
    );

    expect(getPrisma).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        dataset: { connect: { id: "ds-1" } },
        filename: "file.fits",
        fileType: "application/fits",
        s3Key: "key",
        sizeBytes: BigInt(1024),
        checksum: undefined,
      },
    });
    expect(result).toEqual(created);
  });

  it("registerArtifact returns null when dataset not found", async () => {
    const mockCreate = vi.fn();
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      datasetArtifact: { create: mockCreate },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await artifactService.registerArtifact(
      "ds-1",
      "user-1",
      {
        filename: "f",
        fileType: "t",
        s3Key: "k",
        sizeBytes: BigInt(0),
      }
    );

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("registerArtifact returns null when dataset belongs to another user", async () => {
    const mockCreate = vi.fn();
    const prisma = {
      dataset: {
        findUnique: vi.fn().mockResolvedValue({
          id: "ds-1",
          userId: "other-user",
          imagePostId: null,
          title: "D",
          description: null,
          visibility: "PRIVATE",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      datasetArtifact: { create: mockCreate },
    } as unknown as PrismaClient;
    vi.mocked(getPrisma).mockResolvedValue(prisma);

    const result = await artifactService.registerArtifact(
      "ds-1",
      "user-1",
      {
        filename: "f",
        fileType: "t",
        s3Key: "k",
        sizeBytes: BigInt(0),
      }
    );

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
