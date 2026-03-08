import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASTRO_CHAT_SYSTEM_PROMPT } from "../ai/prompts";

const { streamOpenAITextMock } = vi.hoisted(() => ({
  streamOpenAITextMock: vi.fn(),
}));

vi.mock("../ai/chat", () => ({
  streamOpenAIText: streamOpenAITextMock,
}));

import { streamChatCompletion } from "./chat";

async function collectStream(stream: AsyncGenerator<string>) {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("streamChatCompletion", () => {
  beforeEach(() => {
    streamOpenAITextMock.mockReset();
  });

  it("trims chat history to the last 20 messages before delegating", async () => {
    streamOpenAITextMock.mockReturnValue(
      (async function* () {
        yield "ok";
      })()
    );

    const messages = Array.from({ length: 25 }, (_, index) => ({
      role: "user" as const,
      content: `message-${index}`,
    }));

    const chunks = await collectStream(streamChatCompletion(messages));

    expect(chunks).toEqual(["ok"]);
    expect(streamOpenAITextMock).toHaveBeenCalledWith({
      systemPrompt: ASTRO_CHAT_SYSTEM_PROMPT,
      messages: messages.slice(-20),
    });
  });
});
