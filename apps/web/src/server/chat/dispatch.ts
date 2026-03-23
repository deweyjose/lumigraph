import type { ChatStreamEvent } from "../chat-stream";
import type { ToolContext } from "../tools/core";
import type { ChatRequestBody } from "./schemas";
import { streamAstroHubChat } from "./surfaces/astro-hub";

/**
 * Run the chat stream for a validated request body and authenticated tool context.
 */
export async function* streamChatDispatch(
  body: ChatRequestBody,
  toolContext: ToolContext
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  switch (body.surface) {
    case "astro_hub":
      yield* streamAstroHubChat(body.messages, toolContext);
      return;
  }
}
