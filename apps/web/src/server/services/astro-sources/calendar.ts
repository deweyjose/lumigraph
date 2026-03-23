import type {
  AstroHubCalendarEvent,
  AstroHubCalendarStream,
} from "@/lib/astro-hub";
import {
  buildAstroHubSourceEnvelope,
  cloneAstroHubSourceData,
  randomizeAstroHubMockDelay,
} from "../astro-hub-mock";
import {
  fetchText,
  formatAstroDateTime,
  parseRssItems,
  selectActionLinks,
  writeAstroSourceOutput,
  type ParsedRssItem,
} from "./shared";

const ITEMS_PER_FEED = 6;
const MAX_CALENDAR_ITEMS = 18;

const NASA_ARTEMIS_FEED_URL = "https://www.nasa.gov/missions/artemis/feed/";
const NASA_STATION_FEED_URL = "https://www.nasa.gov/missions/station/feed/";
const NASA_MAIN_FEED_URL = "https://www.nasa.gov/feed/";

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function rssPubToIso(pubDate: string | null): string | null {
  if (!pubDate) {
    return null;
  }

  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function calendarRowId(
  stream: AstroHubCalendarStream,
  item: ParsedRssItem,
  index: number
): string {
  const seed = item.url || item.id || item.title;
  return `${stream}:${index}:${seed.slice(0, 160)}`;
}

function mapRssToCalendarEvents(
  xml: string,
  stream: AstroHubCalendarStream,
  visibility: string,
  defaultSourceLabel: string
): AstroHubCalendarEvent[] {
  return parseRssItems(xml, ITEMS_PER_FEED).map((item, index) => {
    const publishedAt = rssPubToIso(item.publishedAt);
    const body = item.summary.trim();
    return {
      id: calendarRowId(stream, item, index),
      stream,
      publishedAt,
      title: item.title,
      window: formatAstroDateTime(item.publishedAt) ?? "Date unavailable",
      visibility,
      summary: body ? truncate(body, 160) : undefined,
      body: body || undefined,
      sourceLabel: item.categories[0] ?? defaultSourceLabel,
      url: item.url || undefined,
      imageUrl: item.imageUrl,
      actions: selectActionLinks(item.url, item.links),
    };
  });
}

function sortCalendarEventsNewestFirst(items: AstroHubCalendarEvent[]) {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt
      ? new Date(a.publishedAt).getTime()
      : Number.NEGATIVE_INFINITY;
    const tb = b.publishedAt
      ? new Date(b.publishedAt).getTime()
      : Number.NEGATIVE_INFINITY;
    return tb - ta;
  });
}

export async function getAstroHubCalendarSource() {
  await randomizeAstroHubMockDelay();

  try {
    const [artemisXml, stationXml, mainXml] = await Promise.all([
      fetchText(NASA_ARTEMIS_FEED_URL, { revalidateSeconds: 1800 }),
      fetchText(NASA_STATION_FEED_URL, { revalidateSeconds: 1800 }),
      fetchText(NASA_MAIN_FEED_URL, { revalidateSeconds: 1800 }),
    ]);
    await writeAstroSourceOutput("calendar", {
      artemisXml,
      stationXml,
      mainXml,
    });

    const merged = [
      ...mapRssToCalendarEvents(
        artemisXml,
        "artemis",
        "Artemis mission update",
        "Artemis"
      ),
      ...mapRssToCalendarEvents(
        stationXml,
        "station",
        "Space station operations",
        "Station operations"
      ),
      ...mapRssToCalendarEvents(
        mainXml,
        "nasa_news",
        "NASA newsroom watch",
        "NASA newsroom"
      ),
    ];

    const items = sortCalendarEventsNewestFirst(merged).slice(
      0,
      MAX_CALENDAR_ITEMS
    );

    if (items.length > 0) {
      return buildAstroHubSourceEnvelope(
        "calendar",
        { items },
        { source: "NASA Artemis + station RSS", status: "live" }
      );
    }
  } catch {
    // Fall back to mock data below.
  }

  return buildAstroHubSourceEnvelope(
    "calendar",
    cloneAstroHubSourceData("calendar"),
    {
      source: "Mock Celestial Windows",
      status: "fallback",
    }
  );
}
