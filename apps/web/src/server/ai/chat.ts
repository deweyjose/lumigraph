import { DEFAULT_OPENAI_MODEL } from "./config";
import { createOpenAIClient } from "./client";

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StreamingChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
  }>;
};

type OpenAIStreamingClient = {
  chat: {
    completions: {
      create: (request: {
        model: string;
        messages: AiChatMessage[];
        stream: true;
      }) => Promise<AsyncIterable<StreamingChunk>>;
    };
  };
};

export async function* streamOpenAIText({
  systemPrompt,
  messages,
  model = DEFAULT_OPENAI_MODEL,
  client = createOpenAIClient(),
}: {
  systemPrompt: string;
  messages: AiChatMessage[];
  model?: string;
  client?: OpenAIStreamingClient;
}): AsyncGenerator<string, void, unknown> {
  const stream = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
