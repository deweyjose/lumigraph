import { z } from "zod";
import { generateOpenAIJsonObject } from "@/server/ai/json";
import { generateOpenAIResponsesJsonObject } from "@/server/ai/responses-json";
import {
  POST_WRITEUP_ASSIST_EXPAND_SYSTEM_PROMPT,
  POST_WRITEUP_ASSIST_INTERVIEW_SYSTEM_PROMPT,
  POST_WRITEUP_ASSIST_REFINE_SYSTEM_PROMPT,
} from "@/server/ai/prompts";
import {
  WRITEUP_INTERVIEW_QUESTION_IDS,
  WRITEUP_INTERVIEW_QUESTIONS,
} from "@/lib/post-writeup-interview-questions";

const GeneratedWriteupSchema = z.object({
  description: z.string().min(120).max(900),
});

const RefinedWriteupSchema = z.object({
  description: z.string().min(1).max(900),
});

const ExpandedWriteupSchema = z.object({
  description: z.string().min(220).max(1800),
});

const ExpandedWriteupJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["description"],
  properties: {
    description: {
      type: "string",
      minLength: 220,
      maxLength: 1800,
    },
  },
} as const;

export type PostWriteupAssistContext = {
  title: string;
  description?: string | null;
  targetName?: string | null;
  targetType?: string | null;
  captureDate?: Date | null;
  bortle?: number | null;
};

function buildPostContextLines(context: PostWriteupAssistContext) {
  const captureDate = context.captureDate
    ? context.captureDate.toISOString().slice(0, 10)
    : null;

  return [
    `Title: ${context.title}`,
    `Existing description (may be empty): ${context.description?.trim() || "none"}`,
    `Target name: ${context.targetName?.trim() || "unknown"}`,
    `Target type: ${context.targetType ?? "unknown"}`,
    `Capture date: ${captureDate ?? "unknown"}`,
    `Bortle class: ${context.bortle ?? "unknown"}`,
  ].join("\n");
}

function formatInterviewAnswers(answers: Record<string, string>) {
  const lines: string[] = [];
  for (const id of WRITEUP_INTERVIEW_QUESTION_IDS) {
    const raw = answers[id]?.trim() ?? "";
    const meta = WRITEUP_INTERVIEW_QUESTIONS.find((q) => q.id === id);
    if (!meta) continue;
    if (!raw) {
      if (meta.required) {
        lines.push(`${id}: (missing — should not happen)`);
      }
      continue;
    }
    lines.push(`${id}: ${raw}`);
  }
  return lines.join("\n");
}

function buildInterviewUserPrompt(
  context: PostWriteupAssistContext,
  answers: Record<string, string>
) {
  return [
    "Use the post context and interview answers below.",
    "",
    "Post context:",
    buildPostContextLines(context),
    "",
    "Interview answers:",
    formatInterviewAnswers(answers),
  ].join("\n");
}

export async function generatePostWriteupFromInterview(
  context: PostWriteupAssistContext,
  answers: Record<string, string>
) {
  const response = await generateOpenAIJsonObject({
    systemPrompt: POST_WRITEUP_ASSIST_INTERVIEW_SYSTEM_PROMPT,
    userPrompt: buildInterviewUserPrompt(context, answers),
    schema: GeneratedWriteupSchema,
  });

  return { description: response.description.trim() };
}

function buildRefineUserPrompt(
  context: PostWriteupAssistContext,
  currentDescription: string
) {
  return [
    "Polish the write-up below. Use post context only to avoid contradicting metadata.",
    "",
    "Post context:",
    buildPostContextLines(context),
    "",
    "Current write-up:",
    currentDescription.trim(),
  ].join("\n");
}

export async function refinePostWriteup(
  context: PostWriteupAssistContext,
  currentDescription: string
) {
  const response = await generateOpenAIJsonObject({
    systemPrompt: POST_WRITEUP_ASSIST_REFINE_SYSTEM_PROMPT,
    userPrompt: buildRefineUserPrompt(context, currentDescription),
    schema: RefinedWriteupSchema,
  });

  return { description: response.description.trim() };
}

function buildExpandUserPrompt(
  context: PostWriteupAssistContext,
  currentDescription: string
) {
  return [
    "Expand the current draft into a fuller write-up.",
    "Use post context to avoid contradicting metadata.",
    "Use web research only for stable target facts that can be identified with high confidence.",
    "",
    "Post context:",
    buildPostContextLines(context),
    "",
    "Current draft:",
    currentDescription.trim(),
  ].join("\n");
}

export async function expandPostWriteup(
  context: PostWriteupAssistContext,
  currentDescription: string
) {
  const response = await generateOpenAIResponsesJsonObject({
    instructions: POST_WRITEUP_ASSIST_EXPAND_SYSTEM_PROMPT,
    input: buildExpandUserPrompt(context, currentDescription),
    schema: ExpandedWriteupSchema,
    jsonSchema: ExpandedWriteupJsonSchema,
    schemaName: "post_writeup_expand",
    tools: [{ type: "web_search" }],
    include: ["web_search_call.action.sources"],
  });

  return { description: response.description.trim() };
}
