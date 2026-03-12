import { describe, expect, it, vi } from "vitest";
import {
  buildAstroHubSourceEnvelope,
  cloneAstroHubSourceData,
  isAstroHubSourceKey,
  randomizeAstroHubMockDelay,
} from "./astro-hub-mock";

describe("astro-hub mock helpers", () => {
  it("recognizes supported source keys", () => {
    expect(isAstroHubSourceKey("iss")).toBe(true);
    expect(isAstroHubSourceKey("hero")).toBe(true);
    expect(isAstroHubSourceKey("unknown")).toBe(false);
  });

  it("clones source data before building an envelope", () => {
    const envelope = buildAstroHubSourceEnvelope(
      "iss",
      cloneAstroHubSourceData("iss"),
      { source: "Where The ISS At", status: "live" }
    );

    expect(envelope.sourceKey).toBe("iss");
    expect(envelope.source).toBe("Where The ISS At");
    expect(envelope.status).toBe("live");
    expect(envelope.data).toMatchObject({
      latitude: 29.42,
      longitude: -105.03,
      speedKph: 27540,
    });
    expect(new Date(envelope.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("waits for the randomized mock delay", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const promise = randomizeAstroHubMockDelay();
    await vi.advanceTimersByTimeAsync(500);
    await promise;

    vi.restoreAllMocks();
    vi.useRealTimers();
  });
});
