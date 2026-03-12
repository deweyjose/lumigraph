import { describe, expect, it } from "vitest";
import { parseRssItems } from "./shared";

describe("parseRssItems", () => {
  it("extracts basic item fields from RSS xml", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title><![CDATA[ISS update]]></title>
            <link>https://www.nasa.gov/example</link>
            <guid>guid-1</guid>
            <pubDate>Wed, 11 Mar 2026 20:36:11 +0000</pubDate>
            <category><![CDATA[International Space Station (ISS)]]></category>
            <description><![CDATA[<p>Station <strong>status</strong> update &#8217;now&#8217;.</p>]]></description>
            <media:content url="https://www.nasa.gov/image.jpg" />
            <content:encoded><![CDATA[
              <p>Watch the <a href="https://www.youtube.com/watch?v=abc123">briefing</a>.</p>
              <p>Download the <a href="https://www.nasa.gov/report.pdf">report</a>.</p>
            ]]></content:encoded>
          </item>
        </channel>
      </rss>
    `;

    const [item] = parseRssItems(xml, 1);

    expect(item).toMatchObject({
      id: "guid-1",
      title: "ISS update",
      url: "https://www.nasa.gov/example",
      publishedAt: "Wed, 11 Mar 2026 20:36:11 +0000",
      summary: "Station status update ’now’.",
      imageUrl: "https://www.nasa.gov/image.jpg",
      categories: ["International Space Station (ISS)"],
    });
    expect(item.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "https://www.youtube.com/watch?v=abc123",
          kind: "video",
        }),
        expect.objectContaining({
          href: "https://www.nasa.gov/report.pdf",
          kind: "download",
        }),
      ])
    );
  });
});
