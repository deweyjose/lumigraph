import type { PrismaClient, Prisma } from "@prisma/client";

export type UserCreateInput = Pick<
  Prisma.UserCreateInput,
  "email" | "name" | "passwordHash"
>;

export async function findByEmail(prisma: PrismaClient, email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function create(prisma: PrismaClient, data: UserCreateInput) {
  return prisma.user.create({ data });
}
