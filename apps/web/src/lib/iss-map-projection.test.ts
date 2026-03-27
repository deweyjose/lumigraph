import { describe, expect, it } from "vitest";
import {
  interpolateLonLat,
  lonLatToDial,
  lonLatToSvg,
  shortestLongitudeDelta,
} from "./iss-map-projection";

describe("lonLatToSvg", () => {
  it("maps equator and prime meridian to center", () => {
    expect(lonLatToSvg(0, 0)).toEqual({ x: 180, y: 90 });
  });

  it("maps north pole to top edge", () => {
    expect(lonLatToSvg(0, 90)).toEqual({ x: 180, y: 0 });
  });
});

describe("shortestLongitudeDelta", () => {
  it("returns shortest arc across the dateline", () => {
    expect(shortestLongitudeDelta(179, -179)).toBe(2);
    expect(shortestLongitudeDelta(-179, 179)).toBe(-2);
  });
});

describe("interpolateLonLat", () => {
  it("interpolates latitude and longitude", () => {
    const mid = interpolateLonLat(
      { lat: 0, lon: 0 },
      { lat: 10, lon: 10 },
      0.5
    );
    expect(mid.lat).toBeCloseTo(5);
    expect(mid.lon).toBeCloseTo(5);
  });

  it("interpolates across the dateline", () => {
    const mid = interpolateLonLat(
      { lat: 0, lon: 179 },
      { lat: 0, lon: -179 },
      0.5
    );
    expect(mid.lat).toBeCloseTo(0);
    expect(Math.abs(mid.lon)).toBeCloseTo(180);
  });
});

describe("lonLatToDial", () => {
  it("maps origin telemetry to the center", () => {
    expect(lonLatToDial(0, 0)).toEqual({ x: 0, y: 0 });
  });

  it("keeps extreme coordinates inside the dial radius", () => {
    const point = lonLatToDial(180, 90);
    expect(Math.hypot(point.x, point.y)).toBeCloseTo(1);
    expect(point.x).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(0);
  });
});
