import { z } from "zod";
import { CHAT_SURFACES } from "@/lib/chat-surface";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export const chatSurfaceSchema = z.enum(CHAT_SURFACES);

export type { ChatSurface } from "@/lib/chat-surface";

/**
 * POST /api/chat body. `surface` defaults to `astro_hub` for backward compatibility.
 * Optional `context` is reserved for page-scoped IDs (e.g. postId); ignored until that profile exists.
 */
export const chatRequestBodySchema = z.object({
  surface: chatSurfaceSchema.default("astro_hub"),
  messages: z.array(MessageSchema).min(1).max(50),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ChatRequestBody = z.infer<typeof chatRequestBodySchema>;
