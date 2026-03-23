import { ASTRO_CHAT_SYSTEM_PROMPT } from "../../ai/prompts";
import { streamOpenAIResponsesChat } from "../../ai/responses-chat";
import type { AiChatMessage, ChatStreamEvent } from "../../chat-stream";
import type { ToolContext } from "../../tools/core";
import {
  executeAstroHubChatToolByName,
  openAIAstroHubChatTools,
} from "../../tools/astro-hub-chat";
import type OpenAI from "openai";

const MAX_MESSAGES = 20;

const ASTRO_HUB_CHAT_TOOLS: OpenAI.Responses.ResponseCreateParamsStreaming["tools"] =
  [...openAIAstroHubChatTools(), { type: "web_search" }];

/**
 * Astro Hub home chat: live hub source tools + web search (#165/#166).
 */
export async function* streamAstroHubChat(
  messages: AiChatMessage[],
  toolContext: ToolContext
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const trimmed =
    messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;

  yield* streamOpenAIResponsesChat({
    instructions: ASTRO_CHAT_SYSTEM_PROMPT,
    messages: trimmed,
    toolContext,
    tools: ASTRO_HUB_CHAT_TOOLS,
    include: ["web_search_call.action.sources"],
    executeFunctionTool: executeAstroHubChatToolByName,
  });
}
