import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { generateOpenAIResponsesJsonObject } from "./responses-json";

describe("generateOpenAIResponsesJsonObject", () => {
  it("parses and validates a structured Responses API payload", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        description: "Expanded write-up text",
      }),
    });

    const client = {
      responses: {
        create,
      },
    };

    const result = await generateOpenAIResponsesJsonObject({
      instructions: "Expand this draft",
      input: "raw context",
      schema: z.object({
        description: z.string(),
      }),
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["description"],
        properties: {
          description: { type: "string" },
        },
      },
      schemaName: "expanded_writeup",
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      client,
    });

    expect(result).toEqual({ description: "Expanded write-up text" });
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      instructions: "Expand this draft",
      input: "raw context",
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      text: {
        format: {
          type: "json_schema",
          name: "expanded_writeup",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["description"],
            properties: {
              description: { type: "string" },
            },
          },
          strict: true,
        },
      },
    });
  });

  it("throws when the response output text is empty", async () => {
    const client = {
      responses: {
        create: vi.fn().mockResolvedValue({
          output_text: null,
        }),
      },
    };

    await expect(
      generateOpenAIResponsesJsonObject({
        instructions: "Expand this draft",
        input: "raw context",
        schema: z.object({ description: z.string() }),
        jsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["description"],
          properties: {
            description: { type: "string" },
          },
        },
        schemaName: "expanded_writeup",
        client,
      })
    ).rejects.toThrow("Empty OpenAI response");
  });
});
