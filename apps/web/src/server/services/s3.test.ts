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
    it("returns path users/{userId}/images/{imagePostId}/final/{filename}", () => {
      expect(s3Service.imageFinalKey("user-1", "post-1", "original.tif")).toBe(
        "users/user-1/images/post-1/final/original.tif"
      );
    });
  });

  describe("datasetArtifactKey", () => {
    it("returns path users/{userId}/datasets/{datasetId}/{filename}", () => {
      expect(
        s3Service.datasetArtifactKey("user-1", "ds-1", "master.fits")
      ).toBe("users/user-1/datasets/ds-1/master.fits");
    });
  });
});
