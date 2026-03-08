import { describe, expect, it, vi } from "vitest";
import { streamOpenAIText } from "./chat";

async function collectStream(stream: AsyncGenerator<string>) {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("streamOpenAIText", () => {
  it("streams text deltas from the OpenAI client", async () => {
    const create = vi.fn().mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
        yield { choices: [{ delta: { content: null } }] };
      })()
    );

    const client = {
      chat: {
        completions: {
          create,
        },
      },
    };

    const chunks = await collectStream(
      streamOpenAIText({
        systemPrompt: "System prompt",
        messages: [{ role: "user", content: "Hi" }],
        client,
      })
    );

    expect(chunks).toEqual(["Hello", " world"]);
    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "System prompt" },
        { role: "user", content: "Hi" },
      ],
      stream: true,
    });
  });
});
