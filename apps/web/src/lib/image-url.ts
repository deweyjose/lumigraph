/**
 * Helpers for final image display URLs.
 * When finalImageUrl / finalImageThumbUrl store an S3 key (starts with "users/"),
 * the app serves them via proxy routes that redirect to presigned URLs.
 */

export function isFinalImageS3Key(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("users/");
}

/**
 * Returns the URL to use for <img src> for the given stored value.
 * If the value is an S3 key, returns the proxy route; otherwise returns the URL as-is.
 */
export function getFinalImageDisplayUrl(
  postId: string,
  storedUrl: string | null | undefined,
  role: "image" | "thumb"
): string | null {
  if (!storedUrl) return null;
  if (isFinalImageS3Key(storedUrl))
    return `/api/image-posts/${postId}/assets/${role}`;
  return storedUrl;
}
