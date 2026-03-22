import { describe, expect, it, vi } from "vitest";
import { streamOpenAIResponsesChat } from "./responses-chat";

async function collectEvents(
  gen: AsyncGenerator<import("../chat-stream").ChatStreamEvent>
) {
  const out: import("../chat-stream").ChatStreamEvent[] = [];
  for await (const e of gen) {
    out.push(e);
  }
  return out;
}

describe("streamOpenAIResponsesChat", () => {
  it("maps messages to Responses input and streams text deltas", async () => {
    const create = vi.fn().mockResolvedValue(
      (async function* () {
        yield { type: "response.output_text.delta", delta: "Hi" };
        yield { type: "response.output_text.delta", delta: "!" };
        yield {
          type: "response.completed",
          sequence_number: 2,
          response: {
            id: "r1",
            created_at: 0,
            output_text: "Hi!",
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            model: "gpt-4o-mini",
            object: "response",
            output: [],
            parallel_tool_calls: false,
            status: "completed",
            temperature: 1,
            tool_choice: "auto",
            tools: [],
            top_p: 1,
            truncation: "disabled",
            usage: null,
            user: null,
            billing: null,
            max_output_tokens: null,
            max_tool_calls: null,
            previous_response_id: null,
            prompt_cache_key: null,
            prompt_cache_retention: null,
            reasoning: null,
            safety_identifier: null,
            service_tier: null,
            store: true,
            text: { format: { type: "text" } },
          },
        };
      })()
    );

    const client = { responses: { create } };

    const events = await collectEvents(
      streamOpenAIResponsesChat({
        instructions: "You are helpful.",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hey" },
        ],
        client,
      })
    );

    expect(create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      instructions: "You are helpful.",
      input: [
        { type: "message", role: "user", content: "Hello" },
        { type: "message", role: "assistant", content: "Hey" },
      ],
      stream: true,
      tools: [],
    });

    expect(events).toEqual([
      { type: "text_delta", text: "Hi" },
      { type: "text_delta", text: "!" },
      { type: "done" },
    ]);
  });

  it("yields error and stops on stream error event", async () => {
    const create = vi.fn().mockResolvedValue(
      (async function* () {
        yield {
          type: "error",
          code: "x",
          message: "bad",
          param: null,
          sequence_number: 0,
        };
      })()
    );

    const events = await collectEvents(
      streamOpenAIResponsesChat({
        instructions: "Sys",
        messages: [{ role: "user", content: "u" }],
        client: { responses: { create } },
      })
    );

    expect(events).toEqual([{ type: "error", message: "bad" }]);
  });
});
