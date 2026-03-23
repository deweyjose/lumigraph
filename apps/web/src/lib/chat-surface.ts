/**
 * Declared chat surfaces for POST /api/chat. Keep in sync with server profiles
 * (`streamChatDispatch` in `src/server/chat/dispatch.ts`).
 */
export const CHAT_SURFACES = ["astro_hub"] as const;

export type ChatSurface = (typeof CHAT_SURFACES)[number];
