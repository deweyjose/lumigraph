import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as artifactService from "./artifact";
import type { PrismaClient } from "@prisma/client";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("./s3", () => ({
  datasetArtifactKey: vi.fn(
    (userId: string, datasetId: string, filename: string) =>
      `users/${userId}/datasets/${datasetId}/${filename}`
  ),
  getS3Bucket: vi.fn(() => "test-bucket"),
  createPresignedUploadUrl: vi.fn(() =>
    Promise.resolve("https://test-bucket.s3.example.com/presigned-url")
  ),
}));

const { getPrisma } = await import("@lumigraph/db");
const s3Module = await import("./s3");

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

    const result = await artifactService.registerArtifact("ds-1", "user-1", {
      filename: "file.fits",
      fileType: "application/fits",
      s3Key: "key",
      sizeBytes: BigInt(1024),
    });

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

    const result = await artifactService.registerArtifact("ds-1", "user-1", {
      filename: "f",
      fileType: "t",
      s3Key: "k",
      sizeBytes: BigInt(0),
    });

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

    const result = await artifactService.registerArtifact("ds-1", "user-1", {
      filename: "f",
      fileType: "t",
      s3Key: "k",
      sizeBytes: BigInt(0),
    });

    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  describe("getMaxArtifactSizeBytes", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns default 500MB when ARTIFACT_MAX_SIZE_BYTES is unset", () => {
      delete process.env.ARTIFACT_MAX_SIZE_BYTES;
      expect(artifactService.getMaxArtifactSizeBytes()).toBe(500 * 1024 * 1024);
    });

    it("returns env value when ARTIFACT_MAX_SIZE_BYTES is set", () => {
      process.env.ARTIFACT_MAX_SIZE_BYTES = "1048576";
      expect(artifactService.getMaxArtifactSizeBytes()).toBe(1048576);
    });

    it("returns default when ARTIFACT_MAX_SIZE_BYTES is invalid", () => {
      process.env.ARTIFACT_MAX_SIZE_BYTES = "not-a-number";
      expect(artifactService.getMaxArtifactSizeBytes()).toBe(500 * 1024 * 1024);
    });
  });

  describe("createPresignedUploadForArtifact", () => {
    beforeEach(() => {
      vi.mocked(s3Module.createPresignedUploadUrl).mockClear();
      vi.mocked(s3Module.datasetArtifactKey).mockClear();
    });

    it("returns uploadUrl and key when user owns dataset, key follows users/{userId}/datasets/{datasetId}/{filename}", async () => {
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
      } as unknown as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);

      const result = await artifactService.createPresignedUploadForArtifact(
        "ds-1",
        "user-1",
        {
          filename: "master.fits",
          contentType: "application/x-fits",
          contentLength: 1024,
        }
      );

      expect(result).not.toBeNull();
      expect(result).toEqual({
        uploadUrl: "https://test-bucket.s3.example.com/presigned-url",
        key: "users/user-1/datasets/ds-1/master.fits",
      });
      expect(s3Module.datasetArtifactKey).toHaveBeenCalledWith(
        "user-1",
        "ds-1",
        "master.fits"
      );
    });

    it("returns null when dataset not found", async () => {
      const prisma = {
        dataset: { findUnique: vi.fn().mockResolvedValue(null) },
      } as unknown as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);

      const result = await artifactService.createPresignedUploadForArtifact(
        "ds-1",
        "user-1",
        {
          filename: "x.zip",
          contentType: "application/zip",
          contentLength: 100,
        }
      );

      expect(result).toBeNull();
      expect(s3Module.createPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it("returns null when dataset belongs to another user", async () => {
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
      } as unknown as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);

      const result = await artifactService.createPresignedUploadForArtifact(
        "ds-1",
        "user-1",
        {
          filename: "x.zip",
          contentType: "application/zip",
          contentLength: 100,
        }
      );

      expect(result).toBeNull();
      expect(s3Module.createPresignedUploadUrl).not.toHaveBeenCalled();
    });
  });
});
