/**
 * Astro Hub chat uses the OpenAI Responses API (streaming) instead of Chat Completions
 * so we can attach tools (Astro Hub sources, web search) and structured metadata later.
 *
 * @see https://platform.openai.com/docs/api-reference/responses/create
 */
import type {
  EasyInputMessage,
  ResponseCompletedEvent,
  ResponseErrorEvent,
  ResponseFailedEvent,
  ResponseInput,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { createOpenAIClient } from "./client";
import { DEFAULT_OPENAI_MODEL } from "./config";
import type {
  AiChatMessage,
  ChatStreamError,
  ChatStreamEvent,
} from "../chat-stream";

type OpenAIResponsesClient = {
  responses: {
    create: (params: {
      model: string;
      instructions: string;
      input: ResponseInput;
      stream: true;
      tools: [];
    }) => Promise<AsyncIterable<ResponseStreamEvent>>;
  };
};

function mapMessagesToInput(messages: AiChatMessage[]): ResponseInput {
  return messages.map(
    (m): EasyInputMessage => ({
      type: "message",
      role: m.role,
      content: m.content,
    })
  );
}

function errorMessageFromCompleted(
  event: ResponseCompletedEvent
): string | null {
  const err = event.response.error;
  if (!err) return null;
  return typeof err.message === "string"
    ? err.message
    : "Response completed with error";
}

function errorMessageFromFailed(event: ResponseFailedEvent): string {
  const err = event.response.error;
  if (err && typeof err.message === "string") return err.message;
  return "The model response failed";
}

/**
 * Stream assistant text as structured events from OpenAI Responses (streaming).
 */
export async function* streamOpenAIResponsesChat({
  instructions,
  messages,
  model = DEFAULT_OPENAI_MODEL,
  client = createOpenAIClient() as unknown as OpenAIResponsesClient,
}: {
  instructions: string;
  messages: AiChatMessage[];
  model?: string;
  client?: OpenAIResponsesClient;
}): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const stream = await client.responses.create({
    model,
    instructions,
    input: mapMessagesToInput(messages),
    stream: true,
    tools: [],
  });

  try {
    for await (const event of stream) {
      if (event.type === "response.output_text.delta" && event.delta) {
        yield { type: "text_delta", text: event.delta };
        continue;
      }

      if (event.type === "error") {
        yield streamErrorFromApiEvent(event);
        return;
      }

      if (event.type === "response.failed") {
        yield { type: "error", message: errorMessageFromFailed(event) };
        return;
      }

      if (event.type === "response.completed") {
        const msg = errorMessageFromCompleted(event);
        if (msg) {
          yield { type: "error", message: msg };
          return;
        }
      }
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Chat temporarily unavailable. Please try again.";
    yield { type: "error", message };
    return;
  }

  yield { type: "done" };
}

function streamErrorFromApiEvent(event: ResponseErrorEvent): ChatStreamError {
  return {
    type: "error",
    message: event.message || "Unknown error from model stream",
  };
}
