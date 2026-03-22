/**
 * Wire contract for Astro Hub chat: NDJSON lines over HTTP (see POST /api/chat).
 * Extend with tool/citation events in follow-on issues without changing transport.
 */
export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatStreamTextDelta = { type: "text_delta"; text: string };

export type ChatStreamError = { type: "error"; message: string };

export type ChatStreamDone = { type: "done" };

export type ChatStreamEvent =
  | ChatStreamTextDelta
  | ChatStreamError
  | ChatStreamDone;

export function encodeChatStreamLine(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
