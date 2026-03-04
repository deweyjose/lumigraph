import type { PrismaClient } from "@prisma/client";

export async function findDailyCanvas(
  prisma: PrismaClient,
  date: Date
): Promise<{ content: unknown } | null> {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const row = await prisma.dailyCanvas.findUnique({
    where: { date: dateOnly },
  });
  return row ? { content: row.content } : null;
}

export async function createDailyCanvas(
  prisma: PrismaClient,
  date: Date,
  content: object
) {
  const dateOnly = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  return prisma.dailyCanvas.create({
    data: { date: dateOnly, content: content as object },
  });
}
