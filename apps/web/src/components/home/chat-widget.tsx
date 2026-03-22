"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, MessageCircle, Minimize2, UserRound, X } from "lucide-react";
import type { ChatCitation } from "@/server/chat-stream";
import { parseNdjsonChatLine } from "@/lib/astro-chat-stream";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
};

function citationLabel(c: ChatCitation): string {
  const t = c.title?.trim();
  if (t) return t;
  try {
    return new URL(c.url).hostname;
  } catch {
    return c.url;
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
            const ev = parseNdjsonChatLine(line);
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
            } else if (ev.type === "citations") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = {
                    ...last,
                    citations: ev.citations,
                  };
                }
                return next;
              });
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

        const tail = parseNdjsonChatLine(lineBuffer);
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
        } else if (tail?.type === "citations") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                citations: tail.citations,
              };
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
            className={`flex flex-col rounded-lg border border-border bg-background shadow-xl ${
              isMinimized
                ? "h-14 w-14 overflow-hidden"
                : "h-[min(420px,80vh)] w-[min(360px,90vw)] min-h-[280px] min-w-[280px] max-h-[80vh] max-w-[90vw] resize overflow-hidden"
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
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                  {messages.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Ask about astrophotography, targets, or astronomy!
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          m.role === "user"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                        aria-hidden
                      >
                        {m.role === "user" ? (
                          <UserRound className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      <div
                        className={`min-w-0 max-w-[min(100%,28rem)] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.content ||
                            (isLoading && i === messages.length - 1 ? "…" : "")}
                        </div>
                        {m.role === "assistant" &&
                          m.citations &&
                          m.citations.length > 0 && (
                            <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs">
                              <li className="font-medium text-muted-foreground">
                                Sources
                              </li>
                              {m.citations.map((c, j) => (
                                <li key={`${c.url}-${j}`}>
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline-offset-2 hover:underline"
                                  >
                                    {citationLabel(c)}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
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
