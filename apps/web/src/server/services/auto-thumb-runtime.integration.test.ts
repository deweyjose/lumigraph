import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { beforeAll, describe, expect, it } from "vitest";
import { getS3Bucket, getS3Client, imageAutoThumbKey } from "./s3";

const useLocalStack =
  typeof process.env.AWS_S3_ENDPOINT === "string" &&
  process.env.AWS_S3_ENDPOINT.length > 0 &&
  typeof process.env.AWS_LAMBDA_ENDPOINT === "string" &&
  process.env.AWS_LAMBDA_ENDPOINT.length > 0 &&
  typeof process.env.AUTO_THUMB_LAMBDA_NAME === "string" &&
  process.env.AUTO_THUMB_LAMBDA_NAME.length > 0;

const SOURCE_IMAGE_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1NnL8AAAAASUVORK5CYII=",
  "base64"
);

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) throw new Error("S3 object body was empty");
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const withTransform = body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof withTransform.transformToByteArray === "function") {
    const bytes = await withTransform.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (
    typeof body === "object" &&
    body !== null &&
    Symbol.asyncIterator in body
  ) {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | string>) {
      chunks.push(
        typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk)
      );
    }
    return Buffer.concat(chunks);
  }

  throw new Error("Unsupported S3 object body type");
}

describe("auto-thumb Lambda (integration)", () => {
  beforeAll(async () => {
    if (!useLocalStack) return;
    const client = await getS3Client();
    const bucket = getS3Bucket();
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (err) {
      if (
        err instanceof Error &&
        !err.message.includes("BucketAlreadyOwnedByYou") &&
        !err.message.includes("BucketAlreadyExists")
      ) {
        throw err;
      }
    }
  });

  it.skipIf(!useLocalStack)(
    "invokes Lambda and writes the generated thumbnail key",
    async () => {
      const bucket = getS3Bucket();
      const userId = "user-int";
      const postId = "post-int";
      const jobId = `job-${Date.now()}`;
      const sourceKey = `users/${userId}/posts/${postId}/final/source-${jobId}.png`;
      const outputThumbKey = imageAutoThumbKey(userId, postId, jobId);

      const s3 = await getS3Client();
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: sourceKey,
          Body: SOURCE_IMAGE_BYTES,
          ContentType: "image/png",
        })
      );

      const lambda = new LambdaClient({
        region: process.env.AWS_REGION ?? "us-east-1",
        endpoint: process.env.AWS_LAMBDA_ENDPOINT,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
          ...(process.env.AWS_SESSION_TOKEN
            ? { sessionToken: process.env.AWS_SESSION_TOKEN }
            : {}),
        },
      });

      const invoke = await lambda.send(
        new InvokeCommand({
          FunctionName: process.env.AUTO_THUMB_LAMBDA_NAME,
          Payload: Buffer.from(
            JSON.stringify({
              jobId,
              userId,
              postId,
              bucket,
              sourceObjectKey: sourceKey,
              outputThumbKey,
              callbackUrl: "http://127.0.0.1:9/callback",
            })
          ),
        })
      );

      const invokeError = invoke.FunctionError ?? null;
      expect(invokeError).toBeNull();

      const object = await s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: outputThumbKey,
        })
      );

      const thumb = await bodyToBuffer(object.Body);
      expect(thumb.length).toBeGreaterThan(0);
    }
  );
});
