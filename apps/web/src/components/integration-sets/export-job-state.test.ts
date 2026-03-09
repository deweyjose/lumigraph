import { describe, expect, it } from "vitest";
import {
  downloadUnavailableMessage,
  isExportJobActive,
  isExportJobExpired,
  mergeExportJobsFromList,
  type ExportJobRow,
} from "./export-job-state";

function makeJob(overrides: Partial<ExportJobRow> = {}): ExportJobRow {
  return {
    id: "job-1",
    status: "PENDING",
    selectedPaths: ["lights"],
    totalFiles: 10,
    completedFiles: 0,
    lastProgressAt: null,
    outputS3Key: "users/u1/exports/integration-sets/s1/job-1.zip",
    outputSizeBytes: null,
    errorMessage: null,
    createdAt: "2026-03-08T00:00:00.000Z",
    updatedAt: "2026-03-08T00:00:00.000Z",
    completedAt: null,
    expiresAt: "2026-03-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("export-job-state", () => {
  it("tracks active statuses", () => {
    expect(isExportJobActive("PENDING")).toBe(true);
    expect(isExportJobActive("RUNNING")).toBe(true);
    expect(isExportJobActive("READY")).toBe(false);
  });

  it("computes expiry from explicit flag or timestamp", () => {
    expect(
      isExportJobExpired(
        makeJob({
          status: "READY",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          isExpired: true,
        })
      )
    ).toBe(true);

    expect(
      isExportJobExpired(
        makeJob({
          status: "READY",
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        })
      )
    ).toBe(true);

    expect(
      isExportJobExpired(
        makeJob({
          status: "READY",
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })
      )
    ).toBe(false);
  });

  it("keeps newer local terminal status when poll response is stale", () => {
    const existing = [
      makeJob({
        id: "job-1",
        status: "CANCELLED",
        updatedAt: "2026-03-08T00:10:00.000Z",
      }),
    ];
    const incoming = [
      makeJob({
        id: "job-1",
        status: "RUNNING",
        updatedAt: "2026-03-08T00:09:00.000Z",
      }),
    ];

    const merged = mergeExportJobsFromList(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("CANCELLED");
  });

  it("does not resurrect deleted jobs from stale poll data", () => {
    const existing = [makeJob({ id: "job-deleted", status: "FAILED" })];
    const incoming = [makeJob({ id: "job-deleted", status: "FAILED" })];

    const merged = mergeExportJobsFromList(
      existing,
      incoming,
      new Set(["job-deleted"])
    );
    expect(merged).toEqual([]);
  });

  it("keeps locally cached download URL for unchanged READY jobs", () => {
    const existing = [
      makeJob({
        id: "job-ready",
        status: "READY",
        updatedAt: "2026-03-08T00:10:00.000Z",
        downloadUrl: "https://example.com/fresh",
      }),
    ];
    const incoming = [
      makeJob({
        id: "job-ready",
        status: "READY",
        updatedAt: "2026-03-08T00:11:00.000Z",
        downloadUrl: undefined,
      }),
    ];

    const merged = mergeExportJobsFromList(existing, incoming);
    expect(merged[0]?.downloadUrl).toBe("https://example.com/fresh");
  });

  it("returns actionable download messages per status", () => {
    expect(
      downloadUnavailableMessage(makeJob({ status: "RUNNING" }))
    ).toContain("Wait for READY");
    expect(downloadUnavailableMessage(makeJob({ status: "FAILED" }))).toContain(
      "Start a new export"
    );
    expect(
      downloadUnavailableMessage(
        makeJob({
          status: "READY",
          expiresAt: new Date(Date.now() - 60_000).toISOString(),
        })
      )
    ).toContain("expired");
  });
});
