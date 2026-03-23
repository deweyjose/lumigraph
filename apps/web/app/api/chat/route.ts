import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "auth";
import { chatDebug, chatError, chatInfo, chatWarn } from "@/server/chat-log";
import { encodeChatStreamLine } from "@/server/chat-stream";
import { streamAstroHubChat } from "@/server/services/chat";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Sign in to use the chatbot" },
      { status: 401 }
    );
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.issues.map((e) => e.message).join("; ");
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { code: "INVALID_JSON", message: "Invalid request body" },
      { status: 400 }
    );
  }

  const chatRunId = randomUUID();

  try {
    chatInfo({
      event: "chat_run_start",
      chatRunId,
      userId: session.user.id,
    });

    const stream = streamAstroHubChat(body.messages, {
      userId: session.user.id,
      chatRunId,
    });

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const event of stream) {
              controller.enqueue(encoder.encode(encodeChatStreamLine(event)));
              if (event.type === "error") {
                break;
              }
            }
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.message
                : "Chat temporarily unavailable. Please try again.";
            chatWarn({
              event: "chat_stream_enumerate_error",
              chatRunId,
              message: msg,
            });
            chatDebug(
              { event: "chat_stream_enumerate_error_detail", chatRunId },
              err
            );
            controller.enqueue(
              encoder.encode(
                encodeChatStreamLine({ type: "error", message: msg })
              )
            );
          } finally {
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat service unavailable";
    chatError({
      event: "chat_route_error",
      chatRunId,
      message,
    });
    chatDebug({ event: "chat_route_error_detail", chatRunId }, e);
    return NextResponse.json({ code: "CHAT_ERROR", message }, { status: 503 });
  }
}
