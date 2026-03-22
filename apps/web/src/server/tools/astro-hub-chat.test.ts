import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAstroHubHeroSourceMock } = vi.hoisted(() => ({
  getAstroHubHeroSourceMock: vi.fn(),
}));

vi.mock("../services/astro-sources/hero", () => ({
  getAstroHubHeroSource: getAstroHubHeroSourceMock,
}));

import {
  executeAstroHubChatToolByName,
  isAstroHubChatToolName,
} from "./astro-hub-chat";

describe("astro-hub chat tools", () => {
  const ctx = { userId: "user-1" };

  beforeEach(() => {
    getAstroHubHeroSourceMock.mockReset();
  });

  it("rejects unknown tool names with structured error", async () => {
    expect(isAstroHubChatToolName("not_a_tool")).toBe(false);
    const result = await executeAstroHubChatToolByName("not_a_tool", ctx, "{}");
    expect(result).toEqual({
      ok: false,
      code: "BAD_REQUEST",
      message: "Unknown Astro Hub tool: not_a_tool",
    });
    expect(getAstroHubHeroSourceMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON arguments", async () => {
    const result = await executeAstroHubChatToolByName(
      "astro_hub_hero",
      ctx,
      "{not-json"
    );
    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Tool arguments must be valid JSON (use {} if no parameters).",
    });
    expect(getAstroHubHeroSourceMock).not.toHaveBeenCalled();
  });

  it("loads hero envelope via existing service on success", async () => {
    getAstroHubHeroSourceMock.mockResolvedValue({
      sourceKey: "hero",
      generatedAt: "2026-01-01T00:00:00.000Z",
      source: "NASA APOD",
      status: "live",
      data: {
        title: "Test APOD",
        summary: "Summary",
        mediaLabel: "Image",
        metrics: [],
        trustSignal: "NASA",
      },
    });

    const result = await executeAstroHubChatToolByName(
      "astro_hub_hero",
      ctx,
      ""
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        sourceKey: "hero",
        status: "live",
        data: { title: "Test APOD" },
      });
    }
    expect(getAstroHubHeroSourceMock).toHaveBeenCalledOnce();
  });
});
