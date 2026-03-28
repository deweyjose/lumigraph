import { describe, expect, it } from "vitest";
import {
  estimateS3MonthlyUsd,
  summarizeIntegrationAssets,
} from "./integration-asset-summary";

describe("summarizeIntegrationAssets", () => {
  it("groups by top-level folder and file type", () => {
    const inv = summarizeIntegrationAssets([
      {
        relativePath: "lights/frame1.fit",
        filename: "frame1.fit",
        contentType: "application/octet-stream",
        sizeBytes: 100,
      },
      {
        relativePath: "lights/frame2.fit",
        filename: "frame2.fit",
        contentType: "application/octet-stream",
        sizeBytes: 200,
      },
      {
        relativePath: "darks/d1.fit",
        filename: "d1.fit",
        contentType: "application/octet-stream",
        sizeBytes: 50,
      },
    ]);
    expect(inv.totalFiles).toBe(3);
    expect(inv.totalBytes).toBe(350);
    const lights = inv.byFolder.find((f) => f.folder === "lights");
    expect(lights?.fileCount).toBe(2);
    expect(lights?.totalBytes).toBe(300);
  });
});

describe("estimateS3MonthlyUsd", () => {
  it("scales linearly with bytes at default rate", () => {
    const gb = 1024 ** 3;
    const oneGbMonth = estimateS3MonthlyUsd(gb);
    expect(oneGbMonth).toBeGreaterThan(0);
    expect(estimateS3MonthlyUsd(2 * gb)).toBeCloseTo(2 * oneGbMonth, 5);
  });
});
