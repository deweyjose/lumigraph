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

import { getAstroHubCalendarSource } from "./calendar";

describe("getAstroHubCalendarSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps NASA RSS feeds into calendar cards", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `
            <rss><channel>
              <item>
                <title>Artemis prep</title>
                <link>https://www.nasa.gov/artemis-prep</link>
                <pubDate>Wed, 11 Mar 2026 20:36:11 +0000</pubDate>
                <category><![CDATA[Artemis 2]]></category>
                <description><![CDATA[<p>Artemis mission planning.</p>]]></description>
                <content:encoded><![CDATA[
                  <p>Watch on <a href="https://www.youtube.com/watch?v=artemis123">YouTube</a>.</p>
                ]]></content:encoded>
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
                <title>Station update</title>
                <pubDate>Wed, 11 Mar 2026 18:00:00 +0000</pubDate>
                <description><![CDATA[<p>Station operations.</p>]]></description>
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
                <title>NASA headline</title>
                <pubDate>Wed, 11 Mar 2026 17:00:00 +0000</pubDate>
                <description><![CDATA[<p>General newsroom update.</p>]]></description>
              </item>
            </channel></rss>
          `,
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const source = await getAstroHubCalendarSource();

    expect(source.sourceKey).toBe("calendar");
    expect(source.source).toBe("NASA Artemis + station RSS");
    expect(source.status).toBe("live");
    expect(source.data.items).toHaveLength(3);
    expect(source.data.items[0]).toMatchObject({
      title: "Artemis prep",
      visibility: "Artemis mission update",
      sourceLabel: "Artemis 2",
      url: "https://www.nasa.gov/artemis-prep",
    });
    expect(source.data.items[0]?.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Open article",
          href: "https://www.nasa.gov/artemis-prep",
        }),
        expect.objectContaining({
          href: "https://www.youtube.com/watch?v=artemis123",
          kind: "video",
        }),
      ])
    );
  });
});
