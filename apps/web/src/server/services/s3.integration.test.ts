/**
 * S3 presigned URL integration tests. Run against LocalStack when
 * AWS_S3_ENDPOINT is set (e.g. in docker-compose integration service).
 * Skipped when not set so unit/integration runs without S3 still pass.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  getS3Client,
  getS3Bucket,
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  imageFinalKey,
} from "./s3";
import { CreateBucketCommand } from "@aws-sdk/client-s3";

const useLocalStack =
  typeof process.env.AWS_S3_ENDPOINT === "string" &&
  process.env.AWS_S3_ENDPOINT.length > 0;

describe("s3 service (integration)", () => {
  beforeAll(async () => {
    if (!useLocalStack) return;
    const client = await getS3Client();
    const bucket = getS3Bucket();
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (e) {
      // Bucket may already exist
      if (
        e instanceof Error &&
        !e.message.includes("BucketAlreadyOwnedByYou") &&
        !e.message.includes("BucketAlreadyExists")
      ) {
        throw e;
      }
    }
  });

  it.skipIf(!useLocalStack)(
    "createPresignedUploadUrl and createPresignedDownloadUrl round-trip via LocalStack",
    async () => {
      const bucket = getS3Bucket();
      const key = imageFinalKey("user-int", "post-int", "test-upload.txt");
      const body = "presigned upload test";

      const uploadUrl = await createPresignedUploadUrl(bucket, key, {
        contentType: "text/plain",
        expiresIn: 60,
      });
      expect(uploadUrl).toBeDefined();
      expect(typeof uploadUrl).toBe("string");
      expect(uploadUrl.length).toBeGreaterThan(0);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body,
        headers: { "Content-Type": "text/plain" },
      });
      const putError = putRes.ok
        ? null
        : `${putRes.status} ${putRes.statusText}: ${await putRes.text()}`;
      expect(putRes.ok, putError ?? undefined).toBe(true);

      const downloadUrl = await createPresignedDownloadUrl(bucket, key, {
        expiresIn: 60,
      });
      expect(downloadUrl).toBeDefined();
      expect(typeof downloadUrl).toBe("string");

      const getRes = await fetch(downloadUrl);
      expect(getRes.ok).toBe(true);
      const text = await getRes.text();
      expect(text).toBe(body);
    }
  );
});
