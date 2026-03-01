import type { Prisma } from "@prisma/client";
import { getPrisma } from "@lumigraph/db";
import * as datasetRepo from "../repo/dataset";

export type CreateDatasetInput = Omit<Prisma.DatasetCreateInput, "user"> & {
  title: string;
};

export type UpdateDatasetInput = Prisma.DatasetUpdateInput;

export async function create(userId: string, data: CreateDatasetInput) {
  const prisma = await getPrisma();
  return datasetRepo.create(prisma, {
    ...data,
    user: { connect: { id: userId } },
  });
}

export async function update(
  userId: string,
  datasetId: string,
  data: UpdateDatasetInput
) {
  const prisma = await getPrisma();
  const existing = await datasetRepo.findById(prisma, datasetId);
  if (!existing) return null;
  if (existing.userId !== userId) return null;
  return datasetRepo.update(prisma, datasetId, data);
}
