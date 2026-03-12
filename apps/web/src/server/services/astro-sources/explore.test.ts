import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../astro-hub-mock", async () => {
  const actual =
    await vi.importActual<typeof import("../astro-hub-mock")>(
      "../astro-hub-mock"
    );

  return {
    ...actual,
    randomizeAstroHubMockDelay: vi.fn().mockResolvedValue(undefined),
  };
});

import { getAstroHubExploreSource } from "./explore";

describe("getAstroHubExploreSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps NASA RSS feeds into explore cards", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `
            <rss><channel>
              <item>
                <title>NASA headline</title>
                <link>https://www.nasa.gov/news</link>
                <pubDate>Wed, 11 Mar 2026 20:36:11 +0000</pubDate>
                <category><![CDATA[Humans in Space]]></category>
                <description><![CDATA[<p>Top level NASA update.</p>]]></description>
                <content:encoded><![CDATA[
                  <p>Watch the <a href="https://www.youtube.com/watch?v=abc123">briefing</a>.</p>
                ]]></content:encoded>
              </item>
              <item>
                <title>Science feature</title>
                <link>https://www.nasa.gov/science</link>
                <pubDate>Wed, 11 Mar 2026 18:00:00 +0000</pubDate>
                <description><![CDATA[<p>Science desk coverage.</p>]]></description>
              </item>
            </channel></rss>
          `,
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          `
            <rss><channel>
              <item>
                <title>Station log</title>
                <link>https://www.nasa.gov/station</link>
                <pubDate>Wed, 11 Mar 2026 17:00:00 +0000</pubDate>
                <description><![CDATA[<p>Station operations briefing.</p>]]></description>
              </item>
            </channel></rss>
          `,
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const source = await getAstroHubExploreSource();

    expect(source.sourceKey).toBe("explore");
    expect(source.source).toBe("NASA main + station RSS");
    expect(source.status).toBe("live");
    expect(source.data.items).toHaveLength(3);
    expect(source.data.items[0]).toMatchObject({
      title: "NASA headline",
      summary: "Top level NASA update.",
      sourceLabel: "Humans in Space",
      url: "https://www.nasa.gov/news",
    });
    expect(source.data.items[0]?.status).toContain("NASA main feed:");
    expect(source.data.items[0]?.status).not.toContain("+0000");
    expect(source.data.items[0]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Open article",
          href: "https://www.nasa.gov/news",
        }),
        expect.objectContaining({
          href: "https://www.youtube.com/watch?v=abc123",
          kind: "video",
        }),
      ])
    );
  });
});
