import {
  buildAstroHubSourceEnvelope,
  cloneAstroHubSourceData,
  randomizeAstroHubMockDelay,
} from "../astro-hub-mock";
import {
  fetchJson,
  fetchText,
  parseRssItems,
  selectActionLinks,
  writeAstroSourceOutput,
} from "./shared";

const NASA_APOD_URL = "https://api.nasa.gov/planetary/apod";
const NASA_IOTD_FEED_URL = "https://www.nasa.gov/feeds/iotd-feed/";

type NasaApodResponse = {
  title: string;
  explanation: string;
  media_type: string;
  url: string;
  hdurl?: string;
  date: string;
  copyright?: string;
};

function getNasaApiKey() {
  return process.env.NASA_API_KEY ?? "DEMO_KEY";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function getAstroHubHeroSource() {
  await randomizeAstroHubMockDelay();

  try {
    const apod = await fetchJson<NasaApodResponse>(
      `${NASA_APOD_URL}?api_key=${getNasaApiKey()}`,
      {
        revalidateSeconds: 3600,
      }
    );
    await writeAstroSourceOutput("hero", apod);

    return buildAstroHubSourceEnvelope(
      "hero",
      {
        title: apod.title,
        summary: truncate(apod.explanation, 260),
        mediaLabel:
          apod.media_type === "image"
            ? "NASA APOD / Image"
            : "NASA APOD / Media",
        metrics: [
          { label: "Source", value: "NASA APOD" },
          { label: "Published", value: apod.date },
          { label: "Media Type", value: apod.media_type },
          {
            label: "Asset URL",
            value: apod.hdurl ? "HD available" : "Standard",
          },
        ],
        trustSignal: "Official NASA APOD feed",
        copyright: apod.copyright,
        imageUrl: apod.media_type === "image" ? apod.url : undefined,
        sourceUrl: apod.url,
        actions: [
          { label: "Open media", href: apod.url, kind: "media" },
          ...(apod.hdurl
            ? [
                {
                  label: "HD image",
                  href: apod.hdurl,
                  kind: "download" as const,
                },
              ]
            : []),
        ],
      },
      { source: "NASA APOD", status: "live" }
    );
  } catch {
    try {
      const rss = await fetchText(NASA_IOTD_FEED_URL, {
        revalidateSeconds: 3600,
      });
      await writeAstroSourceOutput("hero", rss);
      const [fallbackItem] = parseRssItems(rss, 1);

      if (fallbackItem) {
        return buildAstroHubSourceEnvelope(
          "hero",
          {
            title: fallbackItem.title,
            summary: truncate(
              fallbackItem.summary || "NASA Image of the Day fallback item.",
              260
            ),
            mediaLabel: "NASA Image of the Day / RSS",
            metrics: [
              { label: "Source", value: "NASA IOTD" },
              {
                label: "Published",
                value: fallbackItem.publishedAt ?? "Date unavailable",
              },
              {
                label: "Image",
                value: fallbackItem.imageUrl ? "Included" : "Unavailable",
              },
              { label: "Fallback", value: "APOD unavailable" },
            ],
            trustSignal: "Official NASA RSS fallback",
            imageUrl: fallbackItem.imageUrl ?? undefined,
            sourceUrl: fallbackItem.url,
            actions: selectActionLinks(fallbackItem.url, fallbackItem.links),
          },
          { source: "NASA Image of the Day", status: "degraded" }
        );
      }
    } catch {
      // Fall through to mock fallback.
    }

    return buildAstroHubSourceEnvelope(
      "hero",
      cloneAstroHubSourceData("hero"),
      {
        source: "Mock Hero Blend",
        status: "fallback",
      }
    );
  }
}
