import { z } from "zod";
import type { Prisma } from "@lumigraph/db";

export const WorkflowDefinitionParamsSchema = z.object({
  id: z.string().uuid(),
});

const WorkflowSubjectTypeSchema = z
  .enum(["POST", "INTEGRATION_SET"])
  .nullable()
  .optional();

const WorkflowDefinitionStatusSchema = z
  .enum(["DRAFT", "ACTIVE", "ARCHIVED"])
  .optional();

const WorkflowStepKindSchema = z.enum(["INSTRUCTION", "TOOL_CALL", "REVIEW"]);

const RunArtifactRefTypeSchema = z
  .enum(["POST", "INTEGRATION_SET", "ASSET", "DOWNLOAD_JOB"])
  .nullable()
  .optional();

type JsonInputValue = Prisma.InputJsonValue | null;

const JsonValueSchema: z.ZodType<JsonInputValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ])
);

export const WorkflowDefinitionStepSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  position: z.number().int().min(1),
  title: z.string().min(1).max(500),
  kind: WorkflowStepKindSchema,
  instructions: z.string().max(10_000).optional().nullable(),
  toolName: z.string().max(255).optional().nullable(),
  toolInputTemplateJson: JsonValueSchema.optional().nullable(),
  expectedArtifactType: RunArtifactRefTypeSchema,
});

export const WorkflowDefinitionBodySchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).optional().nullable(),
  subjectType: WorkflowSubjectTypeSchema,
  status: WorkflowDefinitionStatusSchema,
  steps: z.array(WorkflowDefinitionStepSchema),
});
