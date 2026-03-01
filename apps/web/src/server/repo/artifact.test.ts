import { describe, it, expect, vi } from "vitest";
import * as artifactRepo from "./artifact";
import type { PrismaClient } from "@prisma/client";

describe("artifactRepo", () => {
  it("create calls prisma.datasetArtifact.create with data and returns result", async () => {
    const created = {
      id: "art-1",
      datasetId: "ds-1",
      filename: "file.fits",
      fileType: "application/fits",
      s3Key: "users/u1/datasets/ds-1/file.fits",
      sizeBytes: BigInt(1024),
      checksum: null,
      createdAt: new Date(),
    };
    const prisma = {
      datasetArtifact: {
        create: vi.fn().mockResolvedValue(created),
      },
    } as unknown as PrismaClient;

    const result = await artifactRepo.create(prisma, {
      dataset: { connect: { id: "ds-1" } },
      filename: "file.fits",
      fileType: "application/fits",
      s3Key: "users/u1/datasets/ds-1/file.fits",
      sizeBytes: BigInt(1024),
    });

    expect(prisma.datasetArtifact.create).toHaveBeenCalledWith({
      data: {
        dataset: { connect: { id: "ds-1" } },
        filename: "file.fits",
        fileType: "application/fits",
        s3Key: "users/u1/datasets/ds-1/file.fits",
        sizeBytes: BigInt(1024),
      },
    });
    expect(result).toEqual(created);
  });

  it("findById calls prisma.datasetArtifact.findUnique with id", async () => {
    const artifact = {
      id: "art-1",
      datasetId: "ds-1",
      filename: "file.fits",
      fileType: "application/fits",
      s3Key: "key",
      sizeBytes: BigInt(1024),
      checksum: null,
      createdAt: new Date(),
    };
    const prisma = {
      datasetArtifact: {
        findUnique: vi.fn().mockResolvedValue(artifact),
      },
    } as unknown as PrismaClient;

    const result = await artifactRepo.findById(prisma, "art-1");

    expect(prisma.datasetArtifact.findUnique).toHaveBeenCalledWith({
      where: { id: "art-1" },
    });
    expect(result).toEqual(artifact);
  });
});
