import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Response } from "openai/resources/responses/responses";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}));

vi.mock("../tools/astro-hub-chat", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../tools/astro-hub-chat")>();
  return {
    ...actual,
    executeAstroHubChatToolByName: (
      ...args: Parameters<typeof actual.executeAstroHubChatToolByName>
    ) => executeMock(...args),
  };
});

import {
  countWebSearchCalls,
  streamOpenAIResponsesChat,
} from "./responses-chat";

function asyncStream(
  events: ResponseStreamEvent[]
): AsyncIterable<ResponseStreamEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const e of events) {
        yield e;
      }
    },
  };
}

async function collectChatStream(
  gen: AsyncGenerator<import("../chat-stream").ChatStreamEvent, void, unknown>
) {
  const out: import("../chat-stream").ChatStreamEvent[] = [];
  for await (const e of gen) {
    out.push(e);
  }
  return out;
}

describe("countWebSearchCalls", () => {
  it("counts web_search_call output items", () => {
    const response = {
      output: [
        {
          type: "web_search_call" as const,
          action: { type: "search" as const },
        },
        {
          type: "web_search_call" as const,
          action: { type: "search" as const },
        },
        { type: "message" as const, role: "assistant" as const, content: [] },
      ],
    } as unknown as Response;
    expect(countWebSearchCalls(response)).toBe(2);
  });

  it("returns 0 when no web search items", () => {
    const response = { output: [] } as unknown as Response;
    expect(countWebSearchCalls(response)).toBe(0);
  });
});

describe("streamOpenAIResponsesChat", () => {
  beforeEach(() => {
    executeMock.mockReset();
    vi.restoreAllMocks();
  });

  it("continues the stream when an Astro Hub tool returns a structured error (no throw)", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    executeMock.mockResolvedValueOnce({
      ok: false as const,
      code: "SERVER_ERROR" as const,
      message: "Simulated tool failure",
    });

    const responseWithToolCall = {
      id: "resp-tool-1",
      output: [
        {
          type: "function_call" as const,
          call_id: "fc-1",
          name: "astro_hub_hero",
          arguments: "{}",
        },
      ],
    } as unknown as Response;

    const responseFinal = {
      id: "resp-final",
      output: [],
    } as unknown as Response;

    const createMock = vi
      .fn()
      .mockResolvedValueOnce(
        asyncStream([
          {
            type: "response.completed",
            response: responseWithToolCall,
          } as ResponseStreamEvent,
        ])
      )
      .mockResolvedValueOnce(
        asyncStream([
          {
            type: "response.output_text.delta",
            delta: "Recovered.",
          } as ResponseStreamEvent,
          {
            type: "response.completed",
            response: responseFinal,
          } as ResponseStreamEvent,
        ])
      );

    const client = {
      responses: { create: createMock },
    };

    const events = await collectChatStream(
      streamOpenAIResponsesChat({
        instructions: "test",
        messages: [{ role: "user", content: "What is on the hub?" }],
        toolContext: { userId: "u1", chatRunId: "run-test-1" },
        client: client as never,
      })
    );

    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events.some((e) => e.type === "done")).toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);

    expect(warnSpy).toHaveBeenCalledWith(
      "[chat]",
      expect.objectContaining({
        event: "tool",
        chatRunId: "run-test-1",
        tool: "astro_hub_hero",
        ok: false,
        code: "SERVER_ERROR",
      })
    );
  });
});
