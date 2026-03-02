import type { PrismaClient, Prisma } from "@prisma/client";

export type DatasetArtifactCreateInput = Prisma.DatasetArtifactCreateInput;

export async function create(
  prisma: PrismaClient,
  data: Prisma.DatasetArtifactCreateInput
) {
  return prisma.datasetArtifact.create({ data });
}

export async function findById(prisma: PrismaClient, id: string) {
  return prisma.datasetArtifact.findUnique({ where: { id } });
}

export async function findByIdWithDataset(prisma: PrismaClient, id: string) {
  return prisma.datasetArtifact.findUnique({
    where: { id },
    include: { dataset: true },
  });
}

export async function findManyByDatasetId(
  prisma: PrismaClient,
  datasetId: string
) {
  return prisma.datasetArtifact.findMany({
    where: { datasetId },
    orderBy: { createdAt: "asc" },
  });
}
