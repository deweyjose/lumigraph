import { describe, it, expect, vi, beforeEach } from "vitest";
import * as finalImage from "./final-image";
import type { PrismaClient } from "@prisma/client";

vi.mock("@lumigraph/db", () => ({
  getPrisma: vi.fn(),
}));
vi.mock("../repo/post", () => ({
  findById: vi.fn(),
  update: vi.fn(),
}));
vi.mock("./s3", () => ({
  imageFinalKey: vi.fn(
    (userId: string, _postId: string, filename: string) =>
      `users/${userId}/images/post-1/final/${filename}`
  ),
  getS3Bucket: vi.fn(() => "test-bucket"),
  createPresignedUploadUrl: vi.fn(() =>
    Promise.resolve("https://presigned.example/put")
  ),
  createPresignedDownloadUrl: vi.fn(() =>
    Promise.resolve("https://presigned.example/get")
  ),
}));

const { getPrisma } = await import("@lumigraph/db");
const postRepo = await import("../repo/post");

describe("final-image service", () => {
  beforeEach(() => {
    vi.mocked(getPrisma).mockReset();
    vi.mocked(postRepo.findById).mockReset();
    vi.mocked(postRepo.update).mockReset();
  });

  describe("isFinalImageS3Key", () => {
    it("returns true for keys starting with users/", () => {
      expect(
        finalImage.isFinalImageS3Key("users/uid/images/pid/final/web.jpg")
      ).toBe(true);
    });
    it("returns false for external URLs", () => {
      expect(
        finalImage.isFinalImageS3Key("https://cdn.example.com/img.jpg")
      ).toBe(false);
    });
    it("returns false for null/undefined", () => {
      expect(finalImage.isFinalImageS3Key(null)).toBe(false);
      expect(finalImage.isFinalImageS3Key(undefined)).toBe(false);
    });
  });

  describe("getMaxFinalImageSizeBytes", () => {
    it("returns default 20MB when env unset", () => {
      expect(finalImage.getMaxFinalImageSizeBytes()).toBe(20 * 1024 * 1024);
    });
  });

  describe("createPresignedUploadForFinalImage", () => {
    it("returns null when post not found", async () => {
      const prisma = {} as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);
      vi.mocked(postRepo.findById).mockResolvedValue(null);

      const result = await finalImage.createPresignedUploadForFinalImage(
        "post-1",
        "user-1",
        {
          filename: "web.jpg",
          contentType: "image/jpeg",
          contentLength: 1024,
        }
      );
      expect(result).toBeNull();
    });

    it("returns null when user does not own post", async () => {
      const prisma = {} as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "other-user",
      } as never);

      const result = await finalImage.createPresignedUploadForFinalImage(
        "post-1",
        "user-1",
        {
          filename: "web.jpg",
          contentType: "image/jpeg",
          contentLength: 1024,
        }
      );
      expect(result).toBeNull();
    });

    it("returns uploadUrl and key when owner", async () => {
      const prisma = {} as PrismaClient;
      vi.mocked(getPrisma).mockResolvedValue(prisma);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
      } as never);

      const result = await finalImage.createPresignedUploadForFinalImage(
        "post-1",
        "user-1",
        {
          filename: "web.jpg",
          contentType: "image/jpeg",
          contentLength: 1024,
        }
      );
      expect(result).toEqual({
        uploadUrl: "https://presigned.example/put",
        key: "users/user-1/images/post-1/final/web.jpg",
      });
    });
  });

  describe("completeFinalImage", () => {
    it("returns null when post not found or not owner", async () => {
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue(null);

      const result = await finalImage.completeFinalImage("post-1", "user-1", {
        key: "users/user-1/images/post-1/final/web.jpg",
        role: "image",
      });
      expect(result).toBeNull();
    });

    it("returns null when key does not match post", async () => {
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
      } as never);

      const result = await finalImage.completeFinalImage("post-1", "user-1", {
        key: "users/user-1/images/other-post/final/web.jpg",
        role: "image",
      });
      expect(result).toBeNull();
    });

    it("updates post and returns result for image role", async () => {
      const updated = {
        id: "post-1",
        finalImageUrl: "users/user-1/images/post-1/final/web.jpg",
      };
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
      } as never);
      vi.mocked(postRepo.update).mockResolvedValue(updated as never);

      const result = await finalImage.completeFinalImage("post-1", "user-1", {
        key: "users/user-1/images/post-1/final/web.jpg",
        role: "image",
      });
      expect(result).toEqual(updated);
      expect(postRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        "post-1",
        { finalImageUrl: "users/user-1/images/post-1/final/web.jpg" }
      );
    });

    it("updates finalImageThumbUrl for thumb role", async () => {
      const updated = {
        id: "post-1",
        finalImageThumbUrl: "users/user-1/images/post-1/final/thumb.jpg",
      };
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
      } as never);
      vi.mocked(postRepo.update).mockResolvedValue(updated as never);

      await finalImage.completeFinalImage("post-1", "user-1", {
        key: "users/user-1/images/post-1/final/thumb.jpg",
        role: "thumb",
      });
      expect(postRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        "post-1",
        { finalImageThumbUrl: "users/user-1/images/post-1/final/thumb.jpg" }
      );
    });
  });

  describe("getPresignedFinalImageUrl", () => {
    it("returns null when stored value is not S3 key", async () => {
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        visibility: "PUBLIC",
        finalImageUrl: "https://cdn.example.com/img.jpg",
        finalImageThumbUrl: null,
      } as never);

      const url = await finalImage.getPresignedFinalImageUrl(
        "post-1",
        "image",
        null
      );
      expect(url).toBeNull();
    });

    it("returns null when viewer cannot access (DRAFT, not owner)", async () => {
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        visibility: "DRAFT",
        finalImageUrl: "users/user-1/images/post-1/final/web.jpg",
        finalImageThumbUrl: null,
      } as never);

      const url = await finalImage.getPresignedFinalImageUrl(
        "post-1",
        "image",
        "other-user"
      );
      expect(url).toBeNull();
    });

    it("returns presigned URL for PUBLIC post", async () => {
      vi.mocked(getPrisma).mockResolvedValue({} as PrismaClient);
      vi.mocked(postRepo.findById).mockResolvedValue({
        id: "post-1",
        userId: "user-1",
        visibility: "PUBLIC",
        finalImageUrl: "users/user-1/images/post-1/final/web.jpg",
        finalImageThumbUrl: null,
      } as never);

      const url = await finalImage.getPresignedFinalImageUrl(
        "post-1",
        "image",
        null
      );
      expect(url).toBe("https://presigned.example/get");
    });
  });
});
