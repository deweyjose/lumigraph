import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as s3Service from "./s3";

describe("s3 service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getS3Bucket", () => {
    it("returns bucket from AWS_S3_BUCKET", () => {
      process.env.AWS_S3_BUCKET = "my-bucket";
      expect(s3Service.getS3Bucket()).toBe("my-bucket");
    });

    it("throws when AWS_S3_BUCKET is unset", () => {
      delete process.env.AWS_S3_BUCKET;
      expect(() => s3Service.getS3Bucket()).toThrow("AWS_S3_BUCKET is not set");
    });

    it("throws when AWS_S3_BUCKET is empty", () => {
      process.env.AWS_S3_BUCKET = "";
      expect(() => s3Service.getS3Bucket()).toThrow("AWS_S3_BUCKET is not set");
    });
  });

  describe("imageFinalKey", () => {
    it("returns path users/{userId}/posts/{postId}/final/{filename}", () => {
      expect(s3Service.imageFinalKey("user-1", "post-1", "original.tif")).toBe(
        "users/user-1/posts/post-1/final/original.tif"
      );
    });
  });

  describe("imageAutoThumbKey", () => {
    it("returns path users/{userId}/posts/{postId}/final/thumbs/{jobId}.webp", () => {
      expect(s3Service.imageAutoThumbKey("user-1", "post-1", "job-1")).toBe(
        "users/user-1/posts/post-1/final/thumbs/job-1.webp"
      );
    });
  });

  describe("integrationSetAssetKey", () => {
    it("returns path users/{userId}/integration-sets/{integrationSetId}/{relativePath}", () => {
      expect(
        s3Service.integrationSetAssetKey(
          "user-1",
          "set-1",
          "lights/master.fits"
        )
      ).toBe("users/user-1/integration-sets/set-1/lights/master.fits");
    });
  });
});
