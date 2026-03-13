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

import { getAstroHubHeroSource } from "./hero";

describe("getAstroHubHeroSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps NASA APOD into the Astro Hub hero contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            title: "Pillars of Creation",
            explanation:
              "A long explanation about nebula structure and imaging conditions.",
            media_type: "image",
            url: "https://apod.nasa.gov/apod/image/example.jpg",
            hdurl: "https://apod.nasa.gov/apod/image/example-hd.jpg",
            date: "2026-03-11",
            copyright: "NASA / ESA",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const source = await getAstroHubHeroSource();

    expect(source.sourceKey).toBe("hero");
    expect(source.source).toBe("NASA APOD");
    expect(source.status).toBe("live");
    expect(source.data).toMatchObject({
      title: "Pillars of Creation",
      mediaLabel: "NASA APOD / Image",
      trustSignal: "Official NASA APOD feed",
      copyright: "NASA / ESA",
      sourceUrl: "https://apod.nasa.gov/apod/image/example.jpg",
    });
    expect(source.data.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Source", value: "NASA APOD" }),
      ])
    );
    expect(source.data.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Open media",
          href: "https://apod.nasa.gov/apod/image/example.jpg",
        }),
        expect.objectContaining({
          label: "HD image",
          href: "https://apod.nasa.gov/apod/image/example-hd.jpg",
        }),
      ])
    );
  });
});
