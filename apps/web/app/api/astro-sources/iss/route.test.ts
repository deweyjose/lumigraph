import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAstroHubIssSourceMock } = vi.hoisted(() => ({
  getAstroHubIssSourceMock: vi.fn(),
}));

vi.mock("@/server/services/astro-sources/iss", () => ({
  getAstroHubIssSource: getAstroHubIssSourceMock,
}));

import { GET } from "./route";

describe("GET /api/astro-sources/iss", () => {
  beforeEach(() => {
    getAstroHubIssSourceMock.mockReset();
  });

  it("returns the ISS source payload", async () => {
    getAstroHubIssSourceMock.mockResolvedValue({
      sourceKey: "iss",
      generatedAt: "2026-03-11T12:00:00.000Z",
      source: "Mock ISS Telemetry",
      status: "degraded",
      data: {
        latitude: 29.42,
        longitude: -105.03,
        speedKph: 27540,
        nextPass: "20:41 local",
        confidence: "Modeled pass confidence 82%",
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      sourceKey: "iss",
      data: { latitude: 29.42, longitude: -105.03 },
    });
  });
});
