import type OpenAI from "openai";
import { z } from "zod";
import { createOpenAIClient } from "./client";
import { DEFAULT_OPENAI_MODEL } from "./config";

type OpenAIResponsesClient = {
  responses: {
    create: (
      request: Pick<
        OpenAI.Responses.ResponseCreateParamsNonStreaming,
        "model" | "instructions" | "input" | "tools" | "include" | "text"
      >
    ) => Promise<{
      output_text?: string | null;
    }>;
  };
};

export async function generateOpenAIResponsesJsonObject<T>({
  instructions,
  input,
  schema,
  jsonSchema,
  schemaName,
  tools,
  include,
  model = DEFAULT_OPENAI_MODEL,
  client = createOpenAIClient(),
}: {
  instructions: string;
  input: string;
  schema: z.ZodType<T>;
  jsonSchema: { [key: string]: unknown };
  schemaName: string;
  tools?: OpenAI.Responses.ResponseCreateParamsNonStreaming["tools"];
  include?: OpenAI.Responses.ResponseCreateParamsNonStreaming["include"];
  model?: string;
  client?: OpenAIResponsesClient;
}) {
  const response = await client.responses.create({
    model,
    instructions,
    input,
    ...(tools ? { tools } : {}),
    ...(include ? { include } : {}),
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        schema: jsonSchema,
        strict: true,
      },
    },
  });

  const raw = response.output_text;
  if (!raw) {
    throw new Error("Empty OpenAI response");
  }

  return schema.parse(JSON.parse(raw) as unknown);
}
