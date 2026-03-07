import { describe, expect, it } from "vitest";
import {
  buildDownloadJobCallbackSignature,
  integrationSetExportZipKey,
  resolveSelectedAssets,
  verifyDownloadJobCallbackSignature,
} from "./download-jobs";

describe("download-jobs service", () => {
  it("resolves mixed file and folder selections with dedupe", () => {
    const assets = [
      {
        id: "a1",
        relativePath: "lights/l1.fit",
        s3Key: "users/u1/integration-sets/s1/lights/l1.fit",
        sizeBytes: 100n,
      },
      {
        id: "a2",
        relativePath: "lights/l2.fit",
        s3Key: "users/u1/integration-sets/s1/lights/l2.fit",
        sizeBytes: 200n,
      },
      {
        id: "a3",
        relativePath: "darks/d1.fit",
        s3Key: "users/u1/integration-sets/s1/darks/d1.fit",
        sizeBytes: 300n,
      },
    ];

    const out = resolveSelectedAssets(assets, ["lights", "lights/l1.fit"]);
    expect(out.ok).toBe(true);
    if (!out.ok) return;

    expect(out.assets.map((a) => a.id).sort()).toEqual(["a1", "a2"]);
    expect(out.selectedPaths).toEqual(["lights", "lights/l1.fit"]);
  });

  it("returns error for invalid path selection", () => {
    const assets = [
      {
        id: "a1",
        relativePath: "lights/l1.fit",
        s3Key: "k1",
        sizeBytes: 10n,
      },
    ];

    const out = resolveSelectedAssets(assets, ["bias"]);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.message).toContain("Invalid selection");
  });

  it("builds deterministic export S3 key", () => {
    expect(integrationSetExportZipKey("u1", "s1", "j1")).toBe(
      "users/u1/exports/integration-sets/s1/j1.zip"
    );
  });

  it("verifies callback signature with timestamp", () => {
    const secret = "test-secret";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      status: "READY",
      outputS3Key: "users/u1/e.zip",
    });

    const signature = buildDownloadJobCallbackSignature(
      secret,
      timestamp,
      body
    );
    const ok = verifyDownloadJobCallbackSignature(
      secret,
      timestamp,
      signature,
      body
    );
    expect(ok).toBe(true);
  });

  it("rejects stale callback signature", () => {
    const secret = "test-secret";
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 10000);
    const body = JSON.stringify({ status: "FAILED", errorMessage: "boom" });

    const signature = buildDownloadJobCallbackSignature(
      secret,
      staleTimestamp,
      body
    );
    const ok = verifyDownloadJobCallbackSignature(
      secret,
      staleTimestamp,
      signature,
      body
    );
    expect(ok).toBe(false);
  });
});
