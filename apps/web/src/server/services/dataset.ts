import { getPrisma, type Prisma } from "@lumigraph/db";
import * as datasetRepo from "../repo/dataset";
import * as postRepo from "../repo/post";

/** Thrown when linking to an image post the user does not own. */
export class InvalidImagePostError extends Error {
  constructor() {
    super("INVALID_IMAGE_POST");
    this.name = "InvalidImagePostError";
  }
}

export type CreateDatasetInput = {
  title: string;
  description?: string | null;
  visibility?: "PRIVATE" | "UNLISTED" | "PUBLIC";
  imagePostId?: string | null;
};

export type UpdateDatasetInput = Prisma.DatasetUpdateInput;

async function ensureImagePostOwnership(
  prisma: Awaited<ReturnType<typeof getPrisma>>,
  imagePostId: string,
  userId: string
): Promise<void> {
  const post = await postRepo.findById(prisma, imagePostId);
  if (!post || post.userId !== userId) {
    throw new InvalidImagePostError();
  }
}

export async function create(userId: string, data: CreateDatasetInput) {
  const prisma = await getPrisma();
  if (data.imagePostId != null && data.imagePostId !== "") {
    await ensureImagePostOwnership(prisma, data.imagePostId, userId);
  }
  const payload: Prisma.DatasetCreateInput = {
    title: data.title,
    description: data.description ?? undefined,
    visibility: data.visibility ?? "PRIVATE",
    user: { connect: { id: userId } },
  };
  if (data.imagePostId != null && data.imagePostId !== "") {
    payload.imagePost = { connect: { id: data.imagePostId } };
  }
  return datasetRepo.create(prisma, payload);
}

export async function listMyDatasets(userId: string) {
  const prisma = await getPrisma();
  return datasetRepo.findManyByUserId(prisma, userId);
}

export async function getById(datasetId: string) {
  const prisma = await getPrisma();
  return datasetRepo.findById(prisma, datasetId);
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
  const connectId =
    data.imagePost &&
    "connect" in data.imagePost &&
    typeof data.imagePost.connect === "object" &&
    data.imagePost.connect !== null &&
    "id" in data.imagePost.connect
      ? (data.imagePost.connect as { id: string }).id
      : null;
  if (connectId) {
    await ensureImagePostOwnership(prisma, connectId, userId);
  }
  return datasetRepo.update(prisma, datasetId, data);
}
