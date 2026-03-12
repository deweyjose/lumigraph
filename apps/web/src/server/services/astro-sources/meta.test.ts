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

import { getAstroHubMetaSource } from "./meta";

describe("getAstroHubMetaSource", () => {
  it("returns a live mission day label", async () => {
    const source = await getAstroHubMetaSource();

    expect(source.sourceKey).toBe("meta");
    expect(source.source).toBe("Mission clock");
    expect(source.status).toBe("live");
    expect(source.data.missionDay).toMatch(/^Day \d{3}$/);
  });
});
