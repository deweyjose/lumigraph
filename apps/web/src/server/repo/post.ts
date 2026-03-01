import type { PrismaClient, Prisma } from "@prisma/client";

export type ImagePostCreateInput = Prisma.ImagePostCreateInput;
export type ImagePostUpdateInput = Prisma.ImagePostUpdateInput;

export async function create(
  prisma: PrismaClient,
  data: Prisma.ImagePostCreateInput
) {
  return prisma.imagePost.create({ data });
}

export async function update(
  prisma: PrismaClient,
  id: string,
  data: Prisma.ImagePostUpdateInput
) {
  return prisma.imagePost.update({ where: { id }, data });
}

export async function findById(prisma: PrismaClient, id: string) {
  return prisma.imagePost.findUnique({ where: { id } });
}

export async function findBySlug(prisma: PrismaClient, slug: string) {
  return prisma.imagePost.findUnique({ where: { slug } });
}

export async function findManyByUserId(
  prisma: PrismaClient,
  userId: string,
  options?: { includeDatasets?: boolean }
) {
  return prisma.imagePost.findMany({
    where: { userId },
    include: options?.includeDatasets ? { datasets: true } : undefined,
    orderBy: { updatedAt: "desc" },
  });
}
