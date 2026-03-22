import type { ChatCitation } from "@/server/chat-stream";

export type NdjsonChatEvent =
  | { type: "text_delta"; text: string }
  | { type: "citations"; citations: ChatCitation[] }
  | { type: "error"; message: string }
  | { type: "done" };

export function parseNdjsonChatLine(line: string): NdjsonChatEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
      return null;
    }
    const t = (parsed as { type: string }).type;
    if (t === "text_delta" && "text" in parsed) {
      const text = (parsed as { text: unknown }).text;
      if (typeof text === "string") {
        return { type: "text_delta", text };
      }
    }
    if (t === "citations" && "citations" in parsed) {
      const raw = (parsed as { citations: unknown }).citations;
      if (!Array.isArray(raw)) return null;
      const citations: ChatCitation[] = [];
      for (const item of raw) {
        if (!item || typeof item !== "object" || !("url" in item)) continue;
        const url = (item as { url: unknown }).url;
        if (typeof url !== "string") continue;
        const title =
          "title" in item &&
          typeof (item as { title: unknown }).title === "string"
            ? (item as { title: string }).title
            : undefined;
        citations.push(title ? { url, title } : { url });
      }
      return { type: "citations", citations };
    }
    if (t === "error" && "message" in parsed) {
      const message = (parsed as { message: unknown }).message;
      if (typeof message === "string") {
        return { type: "error", message };
      }
    }
    if (t === "done") {
      return { type: "done" };
    }
    return null;
  } catch {
    return null;
  }
}
