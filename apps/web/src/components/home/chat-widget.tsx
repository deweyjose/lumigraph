"use client";

import { FloatingChatPanel } from "@/components/chat/floating-chat-panel";

/** Astro Hub preset: same endpoint with `surface: astro_hub` (server default). */
export function ChatWidget() {
  return (
    <FloatingChatPanel
      surface="astro_hub"
      title="Astrophotography Assistant"
      inputPlaceholder="Ask about astrophotography..."
      emptyStateText="Ask about astrophotography, targets, or astronomy!"
      fabAriaLabel="Open astrophotography chatbot"
    />
  );
}
