import type OpenAI from "openai";
import type { ResponseIncludable } from "openai/resources/responses/responses";
import { describe, expect, it, vi } from "vitest";
import {
  executeAstroHubChatToolByName,
  openAIAstroHubChatTools,
} from "../tools/astro-hub-chat";
import {
  extractCitationsFromResponse,
  streamOpenAIResponsesChat,
} from "./responses-chat";

const TEST_TOOLS: OpenAI.Responses.ResponseCreateParamsStreaming["tools"] = [
  ...openAIAstroHubChatTools(),
  { type: "web_search" },
];

const TEST_INCLUDE: ResponseIncludable[] = ["web_search_call.action.sources"];

const TEST_STREAM_OPTIONS = {
  tools: TEST_TOOLS,
  include: TEST_INCLUDE,
  executeFunctionTool: executeAstroHubChatToolByName,
};

async function collectEvents(
  gen: AsyncGenerator<import("../chat-stream").ChatStreamEvent>
) {
  const out: import("../chat-stream").ChatStreamEvent[] = [];
  for await (const e of gen) {
    out.push(e);
  }
  return out;
}

const toolContext = { userId: "test-user" };

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

    const client = { responses: { create } } as unknown as OpenAI;

    const events = await collectEvents(
      streamOpenAIResponsesChat({
        instructions: "You are helpful.",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hey" },
        ],
        toolContext,
        client,
        ...TEST_STREAM_OPTIONS,
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        instructions: "You are helpful.",
        input: [
          { type: "message", role: "user", content: "Hello" },
          { type: "message", role: "assistant", content: "Hey" },
        ],
        stream: true,
        tool_choice: "auto",
        parallel_tool_calls: true,
        include: ["web_search_call.action.sources"],
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: "function",
            name: "astro_hub_hero",
          }),
          expect.objectContaining({ type: "web_search" }),
        ]),
      })
    );
    expect(create.mock.calls[0][0].tools).toHaveLength(7);

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
        toolContext,
        client: { responses: { create } } as unknown as OpenAI,
        ...TEST_STREAM_OPTIONS,
      })
    );

    expect(events).toEqual([{ type: "error", message: "bad" }]);
  });

  it("yields citations from web search sources before done", async () => {
    const responseBase = {
      created_at: 0,
      error: null,
      incomplete_details: null,
      instructions: null,
      metadata: null,
      model: "gpt-4o-mini",
      object: "response" as const,
      parallel_tool_calls: false,
      status: "completed" as const,
      temperature: 1,
      tool_choice: "auto" as const,
      tools: [],
      top_p: 1,
      truncation: "disabled" as const,
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
      text: { format: { type: "text" as const } },
    };

    const create = vi.fn().mockResolvedValue(
      (async function* () {
        yield { type: "response.output_text.delta", delta: "See " };
        yield {
          type: "response.completed",
          sequence_number: 2,
          response: {
            ...responseBase,
            id: "r1",
            output_text: "See ",
            output: [
              {
                type: "web_search_call",
                id: "ws1",
                status: "completed" as const,
                action: {
                  type: "search" as const,
                  query: "mars",
                  sources: [
                    { type: "url" as const, url: "https://a.example" },
                    { type: "url" as const, url: "https://b.example" },
                  ],
                },
              },
            ],
          },
        };
      })()
    );

    const events = await collectEvents(
      streamOpenAIResponsesChat({
        instructions: "Sys",
        messages: [{ role: "user", content: "u" }],
        toolContext,
        client: { responses: { create } } as unknown as OpenAI,
        ...TEST_STREAM_OPTIONS,
      })
    );

    expect(events).toEqual([
      { type: "text_delta", text: "See " },
      {
        type: "citations",
        citations: [{ url: "https://a.example" }, { url: "https://b.example" }],
      },
      { type: "done" },
    ]);
  });
});

describe("extractCitationsFromResponse", () => {
  it("collects url_citation annotations and dedupes by url", () => {
    const response = {
      output: [
        {
          type: "message" as const,
          id: "m1",
          role: "assistant" as const,
          status: "completed" as const,
          content: [
            {
              type: "output_text" as const,
              text: "Hello",
              annotations: [
                {
                  type: "url_citation" as const,
                  url: "https://dup.test",
                  title: "First title",
                  start_index: 0,
                  end_index: 5,
                },
                {
                  type: "url_citation" as const,
                  url: "https://dup.test",
                  title: "Second",
                  start_index: 0,
                  end_index: 5,
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractCitationsFromResponse(response as never)).toEqual([
      { url: "https://dup.test", title: "First title" },
    ]);
  });
});
