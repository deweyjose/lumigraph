/**
 * Wire contract for Astro Hub chat: NDJSON lines over HTTP (see POST /api/chat).
 */
export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatCitation = { url: string; title?: string };

export type ChatStreamTextDelta = { type: "text_delta"; text: string };

export type ChatStreamError = { type: "error"; message: string };

export type ChatStreamCitations = {
  type: "citations";
  citations: ChatCitation[];
};

export type ChatStreamDone = { type: "done" };

export type ChatStreamEvent =
  | ChatStreamTextDelta
  | ChatStreamCitations
  | ChatStreamError
  | ChatStreamDone;

export function encodeChatStreamLine(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}
