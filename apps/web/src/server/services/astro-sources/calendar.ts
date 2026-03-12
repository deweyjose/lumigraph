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
} from "./shared";

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

const NASA_ARTEMIS_FEED_URL = "https://www.nasa.gov/missions/artemis/feed/";
const NASA_STATION_FEED_URL = "https://www.nasa.gov/missions/station/feed/";
const NASA_MAIN_FEED_URL = "https://www.nasa.gov/feed/";

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

    const items = [
      ...parseRssItems(artemisXml, 1).map((item) => ({
        title: item.title,
        window: formatAstroDateTime(item.publishedAt) ?? "Date unavailable",
        visibility: "Artemis mission update",
        summary: truncate(item.summary, 160),
        sourceLabel: item.categories[0] ?? "Artemis",
        url: item.url,
        imageUrl: item.imageUrl,
        actions: selectActionLinks(item.url, item.links),
      })),
      ...parseRssItems(stationXml, 1).map((item) => ({
        title: item.title,
        window: formatAstroDateTime(item.publishedAt) ?? "Date unavailable",
        visibility: "Space station operations",
        summary: truncate(item.summary, 160),
        sourceLabel: item.categories[0] ?? "Station operations",
        url: item.url,
        imageUrl: item.imageUrl,
        actions: selectActionLinks(item.url, item.links),
      })),
      ...parseRssItems(mainXml, 1).map((item) => ({
        title: item.title,
        window: formatAstroDateTime(item.publishedAt) ?? "Date unavailable",
        visibility: "NASA newsroom watch",
        summary: truncate(item.summary, 160),
        sourceLabel: item.categories[0] ?? "NASA newsroom",
        url: item.url,
        imageUrl: item.imageUrl,
        actions: selectActionLinks(item.url, item.links),
      })),
    ];

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
