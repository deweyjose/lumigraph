import { ASTRO_CHAT_SYSTEM_PROMPT } from "../ai/prompts";
import { streamOpenAIResponsesChat } from "../ai/responses-chat";
import type { AiChatMessage, ChatStreamEvent } from "../chat-stream";

export type { AiChatMessage, ChatStreamEvent } from "../chat-stream";

const MAX_MESSAGES = 20;

/**
 * Stream Astro Hub assistant output as structured events (Responses API).
 * Trims to last 20 messages to stay within token limits.
 */
export async function* streamAstroHubChat(
  messages: AiChatMessage[]
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const trimmed =
    messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;

  yield* streamOpenAIResponsesChat({
    instructions: ASTRO_CHAT_SYSTEM_PROMPT,
    messages: trimmed,
  });
}
