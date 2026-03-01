import type { PrismaClient, Prisma } from "@prisma/client";

export type DatasetCreateInput = Prisma.DatasetCreateInput;
export type DatasetUpdateInput = Prisma.DatasetUpdateInput;

export async function create(
  prisma: PrismaClient,
  data: Prisma.DatasetCreateInput
) {
  return prisma.dataset.create({ data });
}

export async function update(
  prisma: PrismaClient,
  id: string,
  data: Prisma.DatasetUpdateInput
) {
  return prisma.dataset.update({ where: { id }, data });
}

export async function findById(prisma: PrismaClient, id: string) {
  return prisma.dataset.findUnique({ where: { id } });
}

export async function findManyByUserId(prisma: PrismaClient, userId: string) {
  return prisma.dataset.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findManyByImagePostId(
  prisma: PrismaClient,
  imagePostId: string
) {
  return prisma.dataset.findMany({
    where: { imagePostId },
    orderBy: { updatedAt: "desc" },
  });
}
