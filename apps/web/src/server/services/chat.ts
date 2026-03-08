import { streamOpenAIText, type AiChatMessage } from "../ai/chat";
import { ASTRO_CHAT_SYSTEM_PROMPT } from "../ai/prompts";

export type ChatMessage = AiChatMessage;

/**
 * Stream OpenAI chat completion for astrophotography assistant.
 * Trims to last 20 messages to stay within token limits.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const trimmed = messages.length > 20 ? messages.slice(-20) : messages;
  yield* streamOpenAIText({
    systemPrompt: ASTRO_CHAT_SYSTEM_PROMPT,
    messages: trimmed,
  });
}
