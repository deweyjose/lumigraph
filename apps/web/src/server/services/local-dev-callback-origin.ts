function isLocalLambdaEndpoint(endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  try {
    const url = new URL(endpoint);
    return ["localhost", "127.0.0.1", "localstack"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function resolveCallbackBaseUrl(
  requestOrigin: string | undefined,
  options?: { localDevOverride?: string | undefined }
): string | null {
  const override = options?.localDevOverride?.trim();
  if (override && isLocalLambdaEndpoint(process.env.AWS_LAMBDA_ENDPOINT)) {
    return override.replace(/\/$/, "");
  }
  if (!requestOrigin) return null;
  return requestOrigin.replace(/\/$/, "");
}
