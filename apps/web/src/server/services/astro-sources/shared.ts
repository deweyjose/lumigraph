import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type FetchOptions = {
  revalidateSeconds: number;
};

export type ParsedContentLink = {
  href: string;
  label: string;
  kind: "article" | "video" | "download" | "reference" | "media";
};

export type ParsedRssItem = {
  id: string;
  title: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  imageUrl: string | null;
  contentHtml: string | null;
  categories: string[];
  links: ParsedContentLink[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const astroSourceOutputRoot = path.resolve(
  process.cwd(),
  "src/server/services/astro-sources/data"
);

function sanitizeUrlForLog(value: string) {
  try {
    const url = new URL(value);
    if (url.searchParams.has("api_key")) {
      url.searchParams.set("api_key", "[redacted]");
    }
    return url.toString();
  } catch {
    return value.replace(/api_key=([^&]+)/i, "api_key=[redacted]");
  }
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10))
    );
}

function stripHtml(value: string) {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTagValue(block: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  const match = block.match(pattern);
  return match ? decodeXmlEntities(match[1]).trim() : null;
}

function extractTagValues(block: string, tagName: string) {
  const pattern = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`,
    "gi"
  );
  const matches = Array.from(block.matchAll(pattern));

  return matches
    .map((match) => decodeXmlEntities(match[1] ?? "").trim())
    .filter(Boolean);
}

function classifyLinkKind(href: string) {
  try {
    const url = new URL(href);
    const pathname = url.pathname.toLowerCase();
    const hostname = url.hostname.toLowerCase();

    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
      return "video" as const;
    }

    if (/\.(pdf|zip)(?:$|\?)/i.test(pathname)) {
      return "download" as const;
    }

    if (/\.(jpg|jpeg|png|gif|webp|mp4|mov)(?:$|\?)/i.test(pathname)) {
      return "media" as const;
    }

    return "reference" as const;
  } catch {
    return "reference" as const;
  }
}

function extractLinksFromHtml(value: string | null) {
  if (!value) {
    return [];
  }

  const links = new Map<string, ParsedContentLink>();
  const pattern = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of value.matchAll(pattern)) {
    const href = decodeXmlEntities(match[1] ?? "").trim();
    if (!href || href.startsWith("mailto:")) {
      continue;
    }

    const label = stripHtml(match[2] ?? "");
    if (!links.has(href)) {
      links.set(href, {
        href,
        label: label || "Open link",
        kind: classifyLinkKind(href),
      });
    }
  }

  return Array.from(links.values());
}

function extractImageUrl(block: string) {
  const mediaContent = block.match(/<media:content[^>]*url="([^"]+)"/i);
  if (mediaContent) {
    return mediaContent[1];
  }

  const enclosure = block.match(/<enclosure[^>]*url="([^"]+)"/i);
  if (enclosure) {
    return enclosure[1];
  }

  const description = extractTagValue(block, "description");
  const imgMatch = description?.match(/<img[^>]*src="([^"]+)"/i);
  if (imgMatch?.[1]) {
    return imgMatch[1];
  }

  const contentHtml = extractTagValue(block, "content:encoded");
  const contentImgMatch = contentHtml?.match(/<img[^>]*src="([^"]+)"/i);
  return contentImgMatch?.[1] ?? null;
}

function buildSummary(description: string | null, contentHtml: string | null) {
  const descriptionText = stripHtml(description ?? "");
  const contentText = stripHtml(contentHtml ?? "");

  if (descriptionText && !descriptionText.includes("[…]")) {
    return descriptionText;
  }

  return contentText || descriptionText;
}

export async function fetchJson<T>(url: string, options: FetchOptions) {
  console.info("[astro-source:fetch:json]", sanitizeUrlForLog(url), {
    revalidateSeconds: options.revalidateSeconds,
  });

  const response = await fetch(url, {
    next: { revalidate: options.revalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function fetchText(url: string, options: FetchOptions) {
  console.info("[astro-source:fetch:text]", sanitizeUrlForLog(url), {
    revalidateSeconds: options.revalidateSeconds,
  });

  const response = await fetch(url, {
    next: { revalidate: options.revalidateSeconds },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }

  return response.text();
}

export async function writeAstroSourceOutput(
  serviceName: string,
  payload: string | Record<string, unknown> | unknown[]
) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    await mkdir(astroSourceOutputRoot, { recursive: true });
    const outputPath = path.join(astroSourceOutputRoot, `${serviceName}.out`);
    const serialized =
      typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

    await writeFile(outputPath, serialized, "utf8");
  } catch (error) {
    console.warn("[astro-source:write:out]", serviceName, {
      message: error instanceof Error ? error.message : "Unknown write failure",
    });
  }
}

export function selectActionLinks(
  sourceUrl: string | null | undefined,
  links: ParsedContentLink[],
  limit = 3
) {
  const actions = new Map<string, ParsedContentLink>();

  if (sourceUrl) {
    actions.set(sourceUrl, {
      href: sourceUrl,
      label: "Open article",
      kind: "article",
    });
  }

  for (const link of links) {
    if (!actions.has(link.href)) {
      actions.set(link.href, link);
    }
  }

  return Array.from(actions.values()).slice(0, limit);
}

export function parseRssItems(xml: string, limit: number): ParsedRssItem[] {
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  return itemBlocks.slice(0, limit).map((block, index) => {
    const url = extractTagValue(block, "link") ?? "";
    const title = extractTagValue(block, "title") ?? "Untitled";
    const guid = extractTagValue(block, "guid");
    const contentHtml = extractTagValue(block, "content:encoded");
    const description = extractTagValue(block, "description");

    return {
      id: guid ?? (url || `${title}-${index}`),
      title,
      url,
      publishedAt: extractTagValue(block, "pubDate"),
      summary: buildSummary(description, contentHtml),
      imageUrl: extractImageUrl(block),
      contentHtml,
      categories: extractTagValues(block, "category"),
      links: extractLinksFromHtml(contentHtml),
    };
  });
}

export function formatAstroDateTime(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(parsed);
}
