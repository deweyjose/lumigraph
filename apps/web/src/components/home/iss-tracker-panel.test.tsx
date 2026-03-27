import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AstroHubSourceEnvelope } from "@/lib/astro-hub";

const { telemetryStateMock } = vi.hoisted(() => ({
  telemetryStateMock: vi.fn(),
}));

vi.mock("./use-iss-telemetry", () => ({
  useIssTelemetry: telemetryStateMock,
}));

vi.mock("./iss-equirect-map", () => ({
  IssEquirectMap: ({
    lat,
    lon,
    history,
  }: {
    lat: number;
    lon: number;
    history: Array<{ lat: number; lon: number }>;
  }) => (
    <div
      data-testid="iss-map"
      data-lat={lat}
      data-lon={lon}
      data-history-count={history.length}
    />
  ),
}));

import { IssTrackerPanel } from "./iss-tracker-panel";

const initialEnvelope: AstroHubSourceEnvelope<"iss"> = {
  sourceKey: "iss",
  generatedAt: "2026-03-26T00:00:00.000Z",
  source: "Where The ISS At",
  status: "live",
  data: {
    latitude: 10,
    longitude: -20,
    speedKph: 27575,
    altitudeKm: 427,
    visibility: "daylight",
    nextPass: "8:50 PM",
    confidence: "Live telemetry from Where The ISS At",
  },
};

describe("IssTrackerPanel", () => {
  beforeEach(() => {
    telemetryStateMock.mockReset();
  });

  it("renders live telemetry status and formatted stats", () => {
    telemetryStateMock.mockReturnValue({
      envelope: initialEnvelope,
      displayPosition: { lat: 42.55, lon: -72.98 },
      positionHistory: [
        { lat: 41.9, lon: -73.4 },
        { lat: 42.55, lon: -72.98 },
      ],
      fetchError: null,
      isRefreshing: true,
    });

    const markup = renderToStaticMarkup(
      <IssTrackerPanel initial={initialEnvelope} />
    );

    expect(markup).toContain("ISS Tracker");
    expect(markup).toContain(">Live<");
    expect(markup).toContain("Refreshing telemetry");
    expect(markup).toContain("42.55N");
    expect(markup).toContain("72.98W");
    expect(markup).toContain("27,575 km/h");
    expect(markup).toContain("427 km");
    expect(markup).toContain("daylight");
    expect(markup).not.toContain("Fallback position");
  });

  it("renders fallback and fetch error messaging when telemetry is degraded", () => {
    telemetryStateMock.mockReturnValue({
      envelope: {
        ...initialEnvelope,
        status: "degraded",
        generatedAt: "2026-03-25T23:58:30.000Z",
        data: {
          ...initialEnvelope.data,
          altitudeKm: undefined,
          visibility: undefined,
          confidence: "Cached fallback model",
        },
      },
      displayPosition: { lat: -12.3, lon: 140.75 },
      positionHistory: [{ lat: -12.3, lon: 140.75 }],
      fetchError: "network timeout",
      isRefreshing: false,
    });

    const markup = renderToStaticMarkup(
      <IssTrackerPanel initial={initialEnvelope} />
    );

    expect(markup).toContain(">Degraded<");
    expect(markup).toContain("Fallback position");
    expect(markup).toContain(
      "Could not refresh telemetry: network timeout. Showing last known position."
    );
    expect(markup).toContain("12.30S");
    expect(markup).toContain("140.75E");
    expect(markup).toContain("Model pending");
    expect(markup).toContain("unknown");
  });
});
