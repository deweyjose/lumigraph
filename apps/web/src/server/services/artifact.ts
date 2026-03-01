import { getPrisma } from "@lumigraph/db";
import * as artifactRepo from "../repo/artifact";
import * as datasetRepo from "../repo/dataset";

export type RegisterArtifactPayload = {
  filename: string;
  fileType: string;
  s3Key: string;
  sizeBytes: bigint;
  checksum?: string | null;
};

export async function registerArtifact(
  datasetId: string,
  userId: string,
  payload: RegisterArtifactPayload
) {
  const prisma = await getPrisma();
  const dataset = await datasetRepo.findById(prisma, datasetId);
  if (!dataset) return null;
  if (dataset.userId !== userId) return null;
  return artifactRepo.create(prisma, {
    dataset: { connect: { id: datasetId } },
    filename: payload.filename,
    fileType: payload.fileType,
    s3Key: payload.s3Key,
    sizeBytes: payload.sizeBytes,
    checksum: payload.checksum ?? undefined,
  });
}
