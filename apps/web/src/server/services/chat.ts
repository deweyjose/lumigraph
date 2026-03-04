import OpenAI from "openai";

const ASTRO_SYSTEM_PROMPT = `You are an astrophotography and astronomy assistant. Help users with:
- Astrophotography techniques, equipment, and targets
- Astronomy concepts, celestial events, and observing tips
- Target recommendations for different skill levels and equipment

Keep responses concise and educational. If asked about unrelated topics, politely redirect to astronomy or astrophotography.`;

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * Stream OpenAI chat completion for astrophotography assistant.
 * Trims to last 20 messages to stay within token limits.
 */
export async function* streamChatCompletion(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const trimmed = messages.length > 20 ? messages.slice(-20) : messages;
  const openai = new OpenAI({ apiKey });

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: ASTRO_SYSTEM_PROMPT },
      ...trimmed.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
