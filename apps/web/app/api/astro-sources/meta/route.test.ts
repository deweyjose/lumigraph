import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAstroHubMetaSourceMock } = vi.hoisted(() => ({
  getAstroHubMetaSourceMock: vi.fn(),
}));

vi.mock("@/server/services/astro-sources/meta", () => ({
  getAstroHubMetaSource: getAstroHubMetaSourceMock,
}));

import { GET } from "./route";

describe("GET /api/astro-sources/meta", () => {
  beforeEach(() => {
    getAstroHubMetaSourceMock.mockReset();
  });

  it("returns the meta source payload", async () => {
    getAstroHubMetaSourceMock.mockResolvedValue({
      sourceKey: "meta",
      generatedAt: "2026-03-11T12:00:00.000Z",
      source: "Mock Mission Stream",
      status: "live",
      data: { missionDay: "Day 068" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      sourceKey: "meta",
      data: { missionDay: "Day 068" },
    });
  });
});
