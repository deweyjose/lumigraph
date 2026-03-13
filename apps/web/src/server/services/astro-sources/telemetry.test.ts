import { describe, expect, it, vi } from "vitest";

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

vi.mock("./hero", () => ({
  getAstroHubHeroSource: vi.fn().mockResolvedValue({
    source: "NASA APOD",
    status: "live",
    generatedAt: new Date().toISOString(),
  }),
}));

vi.mock("./iss", () => ({
  getAstroHubIssSource: vi.fn().mockResolvedValue({
    source: "Where The ISS At",
    status: "live",
    generatedAt: new Date().toISOString(),
    data: { confidence: "Live telemetry from Where The ISS At" },
  }),
}));

vi.mock("./calendar", () => ({
  getAstroHubCalendarSource: vi.fn().mockResolvedValue({
    source: "NASA Artemis + station RSS",
    status: "live",
    generatedAt: new Date().toISOString(),
  }),
}));

vi.mock("./explore", () => ({
  getAstroHubExploreSource: vi.fn().mockResolvedValue({
    source: "NASA main + station RSS",
    status: "live",
    generatedAt: new Date().toISOString(),
  }),
}));

import { getAstroHubTelemetrySource } from "./telemetry";

describe("getAstroHubTelemetrySource", () => {
  it("summarizes source health from the live services", async () => {
    const source = await getAstroHubTelemetrySource();

    expect(source.sourceKey).toBe("telemetry");
    expect(source.source).toBe("Astro Hub source health");
    expect(source.status).toBe("live");
    expect(source.data.items).toHaveLength(4);
    expect(source.data.items[0]).toMatchObject({
      source: "NASA APOD",
      status: "live",
    });
    expect(source.data.items[1]).toMatchObject({
      source: "Where The ISS At",
      trust: "Live telemetry from Where The ISS At",
    });
  });
});
