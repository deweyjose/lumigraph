export function normalizeCallbackUrl(
  raw: string | null | undefined,
  origin?: string
): string {
  if (!raw) return "/";

  if (raw.startsWith("/")) {
    return raw;
  }

  try {
    const url = origin ? new URL(raw, origin) : new URL(raw);
    if (origin) {
      const requestOrigin = new URL(origin);
      if (url.origin !== requestOrigin.origin) {
        return "/";
      }
    }
    return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return "/";
  }
}
