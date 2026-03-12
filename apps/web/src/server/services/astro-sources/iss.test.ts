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

import { getAstroHubIssSource } from "./iss";

describe("getAstroHubIssSource", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Where The ISS At telemetry into the Astro Hub contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            latitude: 30.1,
            longitude: -97.7,
            altitude: 408.4,
            velocity: 27544.3,
            visibility: "daylight",
            timestamp: 1_741_735_600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    const source = await getAstroHubIssSource();

    expect(source.sourceKey).toBe("iss");
    expect(source.source).toBe("Where The ISS At");
    expect(source.status).toBe("live");
    expect(source.data).toMatchObject({
      latitude: 30.1,
      longitude: -97.7,
      altitudeKm: 408,
      visibility: "daylight",
      speedKph: 27544,
      confidence: "Live telemetry from Where The ISS At",
    });
  });
});
