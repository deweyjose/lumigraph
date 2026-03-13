import { describe, expect, it } from "vitest";
import {
  clampInspectorZoom,
  clampPanOffset,
  getContainedImageSize,
  getMaxPanOffset,
  MAX_INSPECTOR_ZOOM,
  MIN_INSPECTOR_ZOOM,
} from "./post-image-inspector-utils";

describe("post image inspector utils", () => {
  it("clamps zoom to the supported range", () => {
    expect(clampInspectorZoom(0.5)).toBe(MIN_INSPECTOR_ZOOM);
    expect(clampInspectorZoom(3.5)).toBe(3.5);
    expect(clampInspectorZoom(100)).toBe(MAX_INSPECTOR_ZOOM);
  });

  it("fits wide images within the available stage", () => {
    expect(
      getContainedImageSize(
        { width: 4000, height: 2000 },
        { width: 1200, height: 900 }
      )
    ).toEqual({ width: 1200, height: 600 });
  });

  it("fits tall images within the available stage", () => {
    expect(
      getContainedImageSize(
        { width: 1200, height: 2400 },
        { width: 1200, height: 900 }
      )
    ).toEqual({ width: 450, height: 900 });
  });

  it("computes the maximum pan range from the displayed image size", () => {
    expect(getMaxPanOffset({ width: 800, height: 600 }, 2)).toEqual({
      x: 400,
      y: 300,
    });
  });

  it("clamps pan offsets to the visible zoom bounds", () => {
    expect(
      clampPanOffset({ x: 999, y: -999 }, { width: 800, height: 600 }, 2)
    ).toEqual({
      x: 400,
      y: -300,
    });
  });
});
