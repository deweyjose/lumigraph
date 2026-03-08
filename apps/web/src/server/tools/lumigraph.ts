import { z } from "zod";
import { toJsonSafe } from "../json";
import {
  listAssetsByIntegrationSetForOwner,
  listPostFinalAssetsForOwner,
} from "../services/assets";
import {
  cancelDownloadJobForOwner,
  createDownloadExportJob,
  deleteDownloadJobForOwner,
  getDownloadJobStatusForOwner,
  listDownloadJobsForIntegrationSetForOwner,
} from "../services/download-jobs";
import {
  createIntegrationSet,
  getIntegrationSetForOwner,
  listMyIntegrationSets,
  updateIntegrationSet,
} from "../services/integration-sets";
import {
  createDraft,
  getPostForOwner,
  listMyPosts,
  publishPost,
  updatePostDraft,
} from "../services/posts";
import {
  defineTool,
  executeTool,
  toolError,
  toolOk,
  type ToolDefinition,
  type ToolContext,
} from "./core";

const TargetType = z.enum([
  "GALAXY",
  "NEBULA",
  "STAR_CLUSTER",
  "PLANETARY_NEBULA",
  "OTHER",
]);

const NullableDateTime = z.string().datetime().nullable();

export const lumigraphTools = [
  defineTool({
    name: "posts.list",
    description: "List the current user's posts.",
    inputSchema: z.object({}),
    async execute(context) {
      const posts = await listMyPosts(context.userId);
      return toolOk(toJsonSafe(posts));
    },
  }),
  defineTool({
    name: "posts.get",
    description: "Fetch one owned post by id.",
    inputSchema: z.object({
      postId: z.string().min(1),
    }),
    async execute(context, input) {
      const post = await getPostForOwner(input.postId, context.userId);
      if (!post) {
        return toolError("NOT_FOUND", "Post not found or you do not own it");
      }
      return toolOk(toJsonSafe(post));
    },
  }),
  defineTool({
    name: "posts.create_draft",
    description: "Create a new draft post for the current user.",
    inputSchema: z.object({
      title: z.string().min(1).max(500),
      slug: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
      description: z.string().max(10_000).optional().nullable(),
      targetName: z.string().max(255).optional().nullable(),
      targetType: TargetType.optional().nullable(),
      captureDate: NullableDateTime.optional(),
      bortle: z.number().int().min(1).max(9).optional().nullable(),
    }),
    async execute(context, input) {
      const post = await createDraft(context.userId, {
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        targetName: input.targetName ?? null,
        targetType: input.targetType ?? null,
        captureDate: input.captureDate ? new Date(input.captureDate) : null,
        bortle: input.bortle ?? null,
      });
      return toolOk(toJsonSafe(post));
    },
  }),
  defineTool({
    name: "posts.update_draft",
    description: "Update an owned draft post.",
    inputSchema: z.object({
      postId: z.string().min(1),
      title: z.string().min(1).max(500).optional(),
      slug: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i)
        .optional(),
      description: z.string().max(10_000).optional().nullable(),
      targetName: z.string().max(255).optional().nullable(),
      targetType: TargetType.optional().nullable(),
      captureDate: NullableDateTime.optional(),
      bortle: z.number().int().min(1).max(9).optional().nullable(),
    }),
    async execute(context, input) {
      const post = await updatePostDraft(context.userId, input.postId, {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.targetName !== undefined && { targetName: input.targetName }),
        ...(input.targetType !== undefined && { targetType: input.targetType }),
        ...(input.captureDate !== undefined && {
          captureDate: input.captureDate ? new Date(input.captureDate) : null,
        }),
        ...(input.bortle !== undefined && { bortle: input.bortle }),
      });
      if (!post) {
        return toolError("NOT_FOUND", "Post not found or you do not own it");
      }
      return toolOk(toJsonSafe(post));
    },
  }),
  defineTool({
    name: "posts.publish",
    description: "Publish an owned post.",
    inputSchema: z.object({
      postId: z.string().min(1),
    }),
    async execute(context, input) {
      const post = await publishPost(context.userId, input.postId);
      if (!post) {
        return toolError("NOT_FOUND", "Post not found or you do not own it");
      }
      return toolOk(toJsonSafe(post));
    },
  }),
  defineTool({
    name: "integration_sets.list",
    description: "List the current user's integration sets.",
    inputSchema: z.object({}),
    async execute(context) {
      const sets = await listMyIntegrationSets(context.userId);
      return toolOk(toJsonSafe(sets));
    },
  }),
  defineTool({
    name: "integration_sets.get",
    description: "Fetch one owned integration set by id.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
    }),
    async execute(context, input) {
      const set = await getIntegrationSetForOwner(
        input.integrationSetId,
        context.userId
      );
      if (!set) {
        return toolError(
          "NOT_FOUND",
          "Integration set not found or you do not own it"
        );
      }
      return toolOk(toJsonSafe(set));
    },
  }),
  defineTool({
    name: "integration_sets.create",
    description: "Create a new integration set for the current user.",
    inputSchema: z.object({
      title: z.string().min(1).max(500),
      notes: z.string().max(10_000).optional().nullable(),
      postId: z.string().min(1).optional().nullable(),
    }),
    async execute(context, input) {
      const set = await createIntegrationSet(context.userId, {
        title: input.title,
        notes: input.notes ?? null,
        postId: input.postId ?? null,
      });
      if (!set) {
        return toolError(
          "NOT_FOUND",
          "Linked post not found or you do not own it"
        );
      }
      return toolOk(toJsonSafe(set));
    },
  }),
  defineTool({
    name: "integration_sets.update",
    description: "Update an owned integration set.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
      title: z.string().min(1).max(500).optional(),
      notes: z.string().max(10_000).optional().nullable(),
      postId: z.string().min(1).optional().nullable(),
    }),
    async execute(context, input) {
      const set = await updateIntegrationSet(
        context.userId,
        input.integrationSetId,
        {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(Object.prototype.hasOwnProperty.call(input, "postId") && {
            postId: input.postId,
          }),
        }
      );
      if (!set) {
        return toolError(
          "NOT_FOUND",
          "Integration set not found, invalid post, or no permission"
        );
      }
      return toolOk(toJsonSafe(set));
    },
  }),
  defineTool({
    name: "assets.list_integration_set",
    description: "List uploaded assets for an owned integration set.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
    }),
    async execute(context, input) {
      const assets = await listAssetsByIntegrationSetForOwner(
        input.integrationSetId,
        context.userId
      );
      if (!assets) {
        return toolError(
          "NOT_FOUND",
          "Integration set not found or you do not own it"
        );
      }
      return toolOk(toJsonSafe(assets));
    },
  }),
  defineTool({
    name: "assets.list_post_final",
    description: "List uploaded final assets for an owned post.",
    inputSchema: z.object({
      postId: z.string().min(1),
    }),
    async execute(context, input) {
      const assets = await listPostFinalAssetsForOwner(
        input.postId,
        context.userId
      );
      if (!assets) {
        return toolError("NOT_FOUND", "Post not found or you do not own it");
      }
      return toolOk(toJsonSafe(assets));
    },
  }),
  defineTool({
    name: "export_jobs.list",
    description: "List export jobs for an owned integration set.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
    }),
    async execute(context, input) {
      const jobs = await listDownloadJobsForIntegrationSetForOwner(
        input.integrationSetId,
        context.userId
      );
      if (!jobs) {
        return toolError(
          "NOT_FOUND",
          "Integration set not found or you do not own it"
        );
      }
      return toolOk(jobs);
    },
  }),
  defineTool({
    name: "export_jobs.get",
    description: "Fetch one export job for an owned integration set.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
      jobId: z.string().min(1),
    }),
    async execute(context, input) {
      const result = await getDownloadJobStatusForOwner(
        input.integrationSetId,
        input.jobId,
        context.userId
      );
      if (!result.ok) {
        return toolError("NOT_FOUND", result.message);
      }
      return toolOk(result.job);
    },
  }),
  defineTool({
    name: "export_jobs.create",
    description: "Create a new export job for an owned integration set.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
      selectedPaths: z.array(z.string().min(1).max(1024)).min(1).max(1000),
      requestOrigin: z.string().url(),
    }),
    async execute(context, input) {
      const result = await createDownloadExportJob({
        userId: context.userId,
        integrationSetId: input.integrationSetId,
        selectedPaths: input.selectedPaths,
        requestOrigin: input.requestOrigin,
      });
      if (!result.ok) {
        return toolError("BAD_REQUEST", result.message);
      }
      return toolOk(result.job);
    },
  }),
  defineTool({
    name: "export_jobs.cancel",
    description: "Cancel a pending or running export job.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
      jobId: z.string().min(1),
    }),
    async execute(context, input) {
      const result = await cancelDownloadJobForOwner(
        input.integrationSetId,
        input.jobId,
        context.userId
      );
      if (!result.ok) {
        return toolError(
          result.code === "NOT_FOUND" ? "NOT_FOUND" : "BAD_REQUEST",
          result.message
        );
      }
      return toolOk(result.job);
    },
  }),
  defineTool({
    name: "export_jobs.delete",
    description: "Delete a terminal export job.",
    inputSchema: z.object({
      integrationSetId: z.string().min(1),
      jobId: z.string().min(1),
    }),
    async execute(context, input) {
      const result = await deleteDownloadJobForOwner(
        input.integrationSetId,
        input.jobId,
        context.userId
      );
      if (!result.ok) {
        return toolError(
          result.code === "NOT_FOUND"
            ? "NOT_FOUND"
            : result.code === "INVALID_STATE"
              ? "BAD_REQUEST"
              : "SERVER_ERROR",
          result.message
        );
      }
      return toolOk({ ok: true });
    },
  }),
] as const;

export type LumigraphToolName = (typeof lumigraphTools)[number]["name"];

const lumigraphToolRegistry = Object.fromEntries(
  lumigraphTools.map((tool) => [tool.name, tool])
) as unknown as Record<LumigraphToolName, ToolDefinition>;

export function getLumigraphTool(name: LumigraphToolName) {
  return lumigraphToolRegistry[name];
}

export async function executeLumigraphTool(
  name: LumigraphToolName,
  context: ToolContext,
  rawInput: unknown
) {
  return executeTool(getLumigraphTool(name), context, rawInput);
}
