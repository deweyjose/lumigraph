"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Minimize2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

type NdjsonEvent =
  | { type: "text_delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };

function parseChatStreamLine(line: string): NdjsonEvent | null {
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

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    const allMessages = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `Request failed (${res.status})`);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let lineBuffer = "";

      if (reader) {
        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          lineBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = lineBuffer.indexOf("\n")) >= 0) {
            const line = lineBuffer.slice(0, newlineIndex);
            lineBuffer = lineBuffer.slice(newlineIndex + 1);
            const ev = parseChatStreamLine(line);
            if (!ev) continue;
            if (ev.type === "text_delta") {
              assistantContent += ev.text;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    content: assistantContent,
                  };
                }
                return next;
              });
              scrollToBottom();
            } else if (ev.type === "error") {
              setError(ev.message);
              const fallback = assistantContent.trim()
                ? assistantContent
                : `[Error: ${ev.message}. Please try again.]`;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: fallback };
                }
                return next;
              });
              break outer;
            }
          }
        }

        const tail = parseChatStreamLine(lineBuffer);
        if (tail?.type === "text_delta") {
          assistantContent += tail.text;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: assistantContent };
            }
            return next;
          });
        } else if (tail?.type === "error") {
          setError(tail.message);
          const fallback = assistantContent.trim()
            ? assistantContent
            : `[Error: ${tail.message}. Please try again.]`;
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: fallback };
            }
            return next;
          });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get response";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `[Error: ${msg}. Please try again.]`,
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  }, [input, isLoading, messages, scrollToBottom]);

  return (
    <>
      {/* Floating trigger button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isOpen ? (
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsOpen(true)}
            aria-label="Open astrophotography chatbot"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        ) : (
          <div
            className={`flex flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xl ${
              isMinimized ? "h-14 w-14" : "h-[420px] w-[360px]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-medium">
                Astrophotography Assistant
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? "Expand" : "Minimize"}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ask about astrophotography, targets, or astronomy!
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {m.content ||
                          (isLoading && i === messages.length - 1 ? "…" : "")}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>

                {error && (
                  <p className="px-3 py-1 text-xs text-destructive">{error}</p>
                )}

                <div className="flex gap-2 border-t border-border p-2">
                  <Input
                    placeholder="Ask about astrophotography..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={isLoading || !input.trim()}
                  >
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
