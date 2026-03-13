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

const NASA_MAIN_FEED_URL = "https://www.nasa.gov/feed/";
const NASA_STATION_FEED_URL = "https://www.nasa.gov/missions/station/feed/";

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function getAstroHubExploreSource() {
  await randomizeAstroHubMockDelay();

  try {
    const [mainFeedXml, stationFeedXml] = await Promise.all([
      fetchText(NASA_MAIN_FEED_URL, { revalidateSeconds: 1800 }),
      fetchText(NASA_STATION_FEED_URL, { revalidateSeconds: 1800 }),
    ]);
    await writeAstroSourceOutput("explore", {
      mainFeedXml,
      stationFeedXml,
    });

    const mainItems = parseRssItems(mainFeedXml, 2).map((item) => ({
      title: item.title,
      summary: truncate(item.summary, 140),
      status: formatAstroDateTime(item.publishedAt)
        ? `NASA main feed: ${formatAstroDateTime(item.publishedAt)}`
        : "NASA main feed update",
      sourceLabel: item.categories[0] ?? "NASA main feed",
      url: item.url,
      imageUrl: item.imageUrl,
      actions: selectActionLinks(item.url, item.links),
    }));
    const stationItems = parseRssItems(stationFeedXml, 1).map((item) => ({
      title: item.title,
      summary: truncate(item.summary, 140),
      status: formatAstroDateTime(item.publishedAt)
        ? `Station feed: ${formatAstroDateTime(item.publishedAt)}`
        : "Station feed update",
      sourceLabel: item.categories[0] ?? "Station feed",
      url: item.url,
      imageUrl: item.imageUrl,
      actions: selectActionLinks(item.url, item.links),
    }));

    const items = [...mainItems, ...stationItems];
    if (items.length > 0) {
      return buildAstroHubSourceEnvelope(
        "explore",
        { items },
        { source: "NASA main + station RSS", status: "live" }
      );
    }
  } catch {
    // Fall back to mock data below.
  }

  return buildAstroHubSourceEnvelope(
    "explore",
    cloneAstroHubSourceData("explore"),
    {
      source: "Mock Explore Layer",
      status: "fallback",
    }
  );
}
