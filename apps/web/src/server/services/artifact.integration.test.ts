import { describe, it, expect, afterEach } from "vitest";
import { getPrisma } from "@lumigraph/db";
import { registerWithPassword } from "./user";
import * as datasetService from "./dataset";
import { registerArtifact } from "./artifact";

describe("artifact service (integration)", () => {
  const unique = `int-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const email = `${unique}@example.com`;
  let userId: string;
  let datasetId: string;

  afterEach(async () => {
    const prisma = await getPrisma();
    if (datasetId) await prisma.datasetArtifact.deleteMany({ where: { datasetId } });
    if (userId) {
      await prisma.dataset.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  it("registerArtifact creates an artifact for a dataset owned by the user", async () => {
    const reg = await registerWithPassword(email, "password123", "Test");
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    userId = reg.userId;

    const dataset = await datasetService.create(userId, {
      title: "Artifact Test Dataset",
      visibility: "PRIVATE",
    });
    expect(dataset).not.toBeNull();
    datasetId = dataset!.id;

    const artifact = await registerArtifact(datasetId, userId, {
      filename: "test.fits",
      fileType: "application/fits",
      s3Key: `users/${userId}/datasets/${datasetId}/test.fits`,
      sizeBytes: 1024n,
      checksum: "sha256-abc",
    });
    expect(artifact).not.toBeNull();
    expect(artifact?.filename).toBe("test.fits");
    expect(artifact?.fileType).toBe("application/fits");
    expect(artifact?.sizeBytes).toBe(1024n);

    const prisma = await getPrisma();
    const found = await prisma.datasetArtifact.findUnique({ where: { id: artifact!.id } });
    expect(found?.filename).toBe("test.fits");
    expect(found?.datasetId).toBe(datasetId);
  });
});
