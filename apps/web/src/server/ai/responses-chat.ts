/**
 * Astro Hub chat uses the OpenAI Responses API (streaming) with Astro Hub function
 * tools (#165) and native web search (#166) with citation metadata on completion.
 *
 * @see https://platform.openai.com/docs/api-reference/responses/create
 */
import OpenAI from "openai";
import type {
  Response,
  ResponseFunctionToolCallItem,
  ResponseInputItem,
  ResponseOutputItem,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { createOpenAIClient } from "./client";
import { DEFAULT_OPENAI_MODEL } from "./config";
import type {
  AiChatMessage,
  ChatCitation,
  ChatStreamError,
  ChatStreamEvent,
} from "../chat-stream";
import type { ToolContext } from "../tools/core";
import {
  executeAstroHubChatToolByName,
  openAIAstroHubChatTools,
} from "../tools/astro-hub-chat";

const MAX_TOOL_ROUNDS = 5;

function mapMessagesToInput(
  messages: AiChatMessage[]
): OpenAI.Responses.ResponseCreateParams["input"] {
  return messages.map((m) => ({
    type: "message" as const,
    role: m.role,
    content: m.content,
  }));
}

function errorMessageFromCompletedResponse(response: Response): string | null {
  const err = response.error;
  if (!err) return null;
  return typeof err.message === "string"
    ? err.message
    : "Response completed with error";
}

function errorMessageFromFailedResponse(response: Response): string {
  const err = response.error;
  if (err && typeof err.message === "string") return err.message;
  return "The model response failed";
}

function isFunctionCallItem(
  item: ResponseOutputItem
): item is ResponseFunctionToolCallItem {
  return item.type === "function_call";
}

function extractFunctionCalls(
  response: Response
): ResponseFunctionToolCallItem[] {
  return response.output.filter(isFunctionCallItem);
}

function mergeCitationUrl(
  acc: Map<string, ChatCitation>,
  url: string,
  title?: string
): void {
  const existing = acc.get(url);
  if (!existing) {
    acc.set(url, title ? { url, title } : { url });
    return;
  }
  if (title && !existing.title) {
    existing.title = title;
  }
}

/** URLs from web search tool items and inline url_citation annotations on assistant text. */
export function extractCitationsFromResponse(
  response: Response
): ChatCitation[] {
  const acc = new Map<string, ChatCitation>();
  for (const item of response.output) {
    if (item.type === "web_search_call") {
      const action = item.action;
      if (action.type === "search" && action.sources) {
        for (const src of action.sources) {
          if (src.type === "url" && typeof src.url === "string") {
            mergeCitationUrl(acc, src.url);
          }
        }
      }
    }
    if (item.type === "message" && item.role === "assistant") {
      for (const part of item.content) {
        if (part.type !== "output_text") continue;
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation" && typeof ann.url === "string") {
            const title = typeof ann.title === "string" ? ann.title : undefined;
            mergeCitationUrl(acc, ann.url, title);
          }
        }
      }
    }
  }
  return [...acc.values()];
}

async function buildFunctionCallOutputItems(
  calls: ResponseFunctionToolCallItem[],
  toolContext: ToolContext
): Promise<ResponseInputItem[]> {
  return Promise.all(
    calls.map(async (call) => {
      const result = await executeAstroHubChatToolByName(
        call.name,
        toolContext,
        call.arguments
      );
      const output = result.ok
        ? JSON.stringify(result.data)
        : JSON.stringify({
            ok: false,
            code: result.code,
            message: result.message,
          });
      return {
        type: "function_call_output" as const,
        call_id: call.call_id,
        output,
      };
    })
  );
}

async function* drainStreamEvents(
  stream: AsyncIterable<ResponseStreamEvent>
): AsyncGenerator<
  | { kind: "client_event"; event: ChatStreamEvent }
  | { kind: "completed"; response: Response },
  void,
  unknown
> {
  let completed: Response | null = null;

  for await (const event of stream) {
    if (event.type === "response.output_text.delta" && event.delta) {
      yield {
        kind: "client_event",
        event: { type: "text_delta", text: event.delta },
      };
      continue;
    }

    if (event.type === "error") {
      yield {
        kind: "client_event",
        event: streamErrorFromApiEvent(event),
      };
      return;
    }

    if (event.type === "response.failed") {
      yield {
        kind: "client_event",
        event: {
          type: "error",
          message: errorMessageFromFailedResponse(event.response),
        },
      };
      return;
    }

    if (event.type === "response.completed") {
      const msg = errorMessageFromCompletedResponse(event.response);
      if (msg) {
        yield { kind: "client_event", event: { type: "error", message: msg } };
        return;
      }
      completed = event.response;
    }
  }

  if (completed) {
    yield { kind: "completed", response: completed };
  }
}

function streamErrorFromApiEvent(event: { message: string }): ChatStreamError {
  return {
    type: "error",
    message: event.message || "Unknown error from model stream",
  };
}

/**
 * Stream assistant text as structured events from OpenAI Responses (streaming),
 * running Astro Hub source tools across multiple rounds when the model requests them.
 */
export async function* streamOpenAIResponsesChat({
  instructions,
  messages,
  toolContext,
  model = DEFAULT_OPENAI_MODEL,
  client = createOpenAIClient(),
}: {
  instructions: string;
  messages: AiChatMessage[];
  toolContext: ToolContext;
  model?: string;
  client?: OpenAI;
}): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const tools: OpenAI.Responses.ResponseCreateParamsStreaming["tools"] = [
    ...openAIAstroHubChatTools(),
    { type: "web_search" },
  ];
  let nextInput: OpenAI.Responses.ResponseCreateParams["input"] =
    mapMessagesToInput(messages);
  let previousResponseId: string | undefined;
  const citationAcc = new Map<string, ChatCitation>();

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const params: OpenAI.Responses.ResponseCreateParamsStreaming = {
        model,
        stream: true,
        tools,
        tool_choice: "auto",
        parallel_tool_calls: true,
        include: ["web_search_call.action.sources"],
      };

      if (round === 0) {
        params.instructions = instructions;
        params.input = nextInput;
      } else {
        params.previous_response_id = previousResponseId;
        params.input = nextInput;
      }

      const stream = await client.responses.create(params);

      let completedResponse: Response | null = null;

      for await (const chunk of drainStreamEvents(stream)) {
        if (chunk.kind === "client_event") {
          yield chunk.event;
          if (chunk.event.type === "error") {
            return;
          }
        } else {
          completedResponse = chunk.response;
        }
      }

      if (!completedResponse) {
        yield {
          type: "error",
          message: "Chat response ended without completion. Please try again.",
        };
        return;
      }

      previousResponseId = completedResponse.id;
      for (const c of extractCitationsFromResponse(completedResponse)) {
        mergeCitationUrl(citationAcc, c.url, c.title);
      }
      const calls = extractFunctionCalls(completedResponse);

      if (calls.length === 0) {
        if (citationAcc.size > 0) {
          yield {
            type: "citations",
            citations: [...citationAcc.values()],
          };
        }
        yield { type: "done" };
        return;
      }

      nextInput = await buildFunctionCallOutputItems(calls, toolContext);
    }

    yield {
      type: "error",
      message:
        "Too many tool rounds. Please simplify your question and try again.",
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Chat temporarily unavailable. Please try again.";
    yield { type: "error", message };
  }
}
