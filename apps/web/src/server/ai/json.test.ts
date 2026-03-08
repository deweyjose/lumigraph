import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { generateOpenAIJsonObject } from "./json";

describe("generateOpenAIJsonObject", () => {
  it("parses and validates a JSON object response", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              title: "APOD",
              count: 2,
            }),
          },
        },
      ],
    });

    const client = {
      chat: {
        completions: {
          create,
        },
      },
    };

    const result = await generateOpenAIJsonObject({
      systemPrompt: "Summarize this data",
      userPrompt: "raw context",
      schema: z.object({
        title: z.string(),
        count: z.number(),
      }),
      client,
    });

    expect(result).toEqual({ title: "APOD", count: 2 });
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Summarize this data" },
        { role: "user", content: "raw context" },
      ],
      response_format: { type: "json_object" },
    });
  });

  it("throws when the response content is empty", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: null } }],
          }),
        },
      },
    };

    await expect(
      generateOpenAIJsonObject({
        systemPrompt: "Summarize this data",
        userPrompt: "raw context",
        schema: z.object({ title: z.string() }),
        client,
      })
    ).rejects.toThrow("Empty OpenAI response");
  });

  it("throws when the JSON shape does not satisfy the schema", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({ title: 123 }),
                },
              },
            ],
          }),
        },
      },
    };

    await expect(
      generateOpenAIJsonObject({
        systemPrompt: "Summarize this data",
        userPrompt: "raw context",
        schema: z.object({ title: z.string() }),
        client,
      })
    ).rejects.toThrow();
  });
});
