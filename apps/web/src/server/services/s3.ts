/**
 * S3 service: client and presigned URL helpers.
 *
 * - On Vercel: uses OIDC to assume AWS_ROLE_ARN (same pattern as RDS). The role must
 *   have s3:PutObject, s3:GetObject (and optionally s3:DeleteObject) on the bucket.
 * - Local: uses default credential chain (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *   or env/instance profile). If S3 is not configured, getS3Client() may throw when
 *   credentials are resolved.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_PRESIGN_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Returns an S3 client. On Vercel with AWS_ROLE_ARN set, uses OIDC.
 * Otherwise uses the default credential provider chain (env vars or instance profile).
 * When AWS_S3_ENDPOINT is set (e.g. LocalStack at http://localstack:4566), the client
 * uses that endpoint and path-style addressing for compatibility.
 */
export async function getS3Client(): Promise<S3Client> {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const endpoint = process.env.AWS_S3_ENDPOINT;
  const usingCustomEndpoint =
    typeof endpoint === "string" && endpoint.length > 0;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const baseConfig: S3ClientConfig = {
    region,
    ...(usingCustomEndpoint && {
      endpoint,
      forcePathStyle: true,
    }),
    ...(usingCustomEndpoint &&
      !process.env.AWS_REQUEST_CHECKSUM_CALCULATION && {
        requestChecksumCalculation: "WHEN_REQUIRED",
      }),
    ...(usingCustomEndpoint &&
      !process.env.AWS_RESPONSE_CHECKSUM_VALIDATION && {
        responseChecksumValidation: "WHEN_REQUIRED",
      }),
    ...(usingCustomEndpoint && {
      // LocalStack requires credentials but accepts static "test" keys.
      credentials: {
        accessKeyId:
          accessKeyId && accessKeyId.length > 0 ? accessKeyId : "test",
        secretAccessKey:
          secretAccessKey && secretAccessKey.length > 0
            ? secretAccessKey
            : "test",
        ...(sessionToken && sessionToken.length > 0 && { sessionToken }),
      },
    }),
  };

  if (process.env.VERCEL && process.env.AWS_ROLE_ARN && !usingCustomEndpoint) {
    const { awsCredentialsProvider } = await import(
      "@vercel/oidc-aws-credentials-provider"
    );
    return new S3Client({
      ...baseConfig,
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN,
      }),
    } as S3ClientConfig);
  }

  return new S3Client(baseConfig);
}

/**
 * Bucket name from env. Use this for all presign and S3 API calls.
 */
export function getS3Bucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not set");
  }
  return bucket;
}

export type PresignedUploadOptions = {
  contentType?: string;
  expiresIn?: number;
};

/**
 * Creates a presigned PUT URL for uploading an object. The client must use
 * the same Content-Type when uploading if you pass contentType here.
 */
export async function createPresignedUploadUrl(
  bucket: string,
  key: string,
  options: PresignedUploadOptions = {}
): Promise<string> {
  const client = await getS3Client();
  const { contentType, expiresIn = DEFAULT_PRESIGN_EXPIRY_SECONDS } = options;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(contentType && { ContentType: contentType }),
  });
  return getSignedUrl(client, command, { expiresIn });
}

export type PresignedDownloadOptions = {
  expiresIn?: number;
  responseContentDisposition?: string;
};

/**
 * Creates a presigned GET URL for downloading an object.
 */
export async function createPresignedDownloadUrl(
  bucket: string,
  key: string,
  options: PresignedDownloadOptions = {}
): Promise<string> {
  const client = await getS3Client();
  const {
    expiresIn = DEFAULT_PRESIGN_EXPIRY_SECONDS,
    responseContentDisposition,
  } = options;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ...(responseContentDisposition && {
      ResponseContentDisposition: responseContentDisposition,
    }),
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Deletes an object from S3.
 */
export async function deleteS3Object(
  bucket: string,
  key: string
): Promise<void> {
  const client = await getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

// ---------------------------------------------------------------------------
// S3 key helpers (match docs/ARCHITECTURE.md § S3 Layout)
// ---------------------------------------------------------------------------

/**
 * Key for a final image file under an image post.
 * e.g. users/{userId}/posts/{postId}/final/original.ext
 */
export function imageFinalKey(
  userId: string,
  postId: string,
  filename: string
): string {
  return `users/${userId}/posts/${postId}/final/${filename}`;
}

/**
 * Key for an integration set file.
 * e.g. users/{userId}/integration-sets/{integrationSetId}/{relativePath}
 */
export function integrationSetAssetKey(
  userId: string,
  integrationSetId: string,
  relativePath: string
): string {
  return `users/${userId}/integration-sets/${integrationSetId}/${relativePath}`;
}
