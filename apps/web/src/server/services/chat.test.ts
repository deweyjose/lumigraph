import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASTRO_CHAT_SYSTEM_PROMPT } from "../ai/prompts";

const { streamOpenAIResponsesChatMock } = vi.hoisted(() => ({
  streamOpenAIResponsesChatMock: vi.fn(),
}));

vi.mock("../ai/responses-chat", () => ({
  streamOpenAIResponsesChat: streamOpenAIResponsesChatMock,
}));

import { streamAstroHubChat } from "./chat";

async function collectStream(
  stream: AsyncGenerator<import("../chat-stream").ChatStreamEvent>
) {
  const chunks: import("../chat-stream").ChatStreamEvent[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

describe("streamAstroHubChat", () => {
  beforeEach(() => {
    streamOpenAIResponsesChatMock.mockReset();
  });

  it("trims chat history to the last 20 messages before delegating", async () => {
    streamOpenAIResponsesChatMock.mockReturnValue(
      (async function* () {
        yield { type: "text_delta", text: "ok" };
        yield { type: "done" };
      })()
    );

    const messages = Array.from({ length: 25 }, (_, index) => ({
      role: "user" as const,
      content: `message-${index}`,
    }));

    const chunks = await collectStream(
      streamAstroHubChat(messages, { userId: "owner-1" })
    );

    expect(chunks).toEqual([
      { type: "text_delta", text: "ok" },
      { type: "done" },
    ]);
    expect(streamOpenAIResponsesChatMock).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: ASTRO_CHAT_SYSTEM_PROMPT,
        messages: messages.slice(-20),
        toolContext: { userId: "owner-1" },
        include: ["web_search_call.action.sources"],
        executeFunctionTool: expect.any(Function),
      })
    );
    expect(streamOpenAIResponsesChatMock.mock.calls[0][0].tools).toHaveLength(
      6
    );
  });
});
