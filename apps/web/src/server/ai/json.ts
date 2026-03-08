import { z } from "zod";
import { DEFAULT_OPENAI_MODEL } from "./config";
import { createOpenAIClient } from "./client";

type OpenAIJsonClient = {
  chat: {
    completions: {
      create: (request: {
        model: string;
        messages: Array<{
          role: "system" | "user";
          content: string;
        }>;
        response_format: {
          type: "json_object";
        };
      }) => Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
          };
        }>;
      }>;
    };
  };
};

export async function generateOpenAIJsonObject<T>({
  systemPrompt,
  userPrompt,
  schema,
  model = DEFAULT_OPENAI_MODEL,
  client = createOpenAIClient(),
}: {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  model?: string;
  client?: OpenAIJsonClient;
}) {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Empty OpenAI response");
  }

  return schema.parse(JSON.parse(raw) as unknown);
}
