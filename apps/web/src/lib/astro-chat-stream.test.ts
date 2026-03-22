import { describe, expect, it } from "vitest";
import { parseNdjsonChatLine } from "./astro-chat-stream";

describe("parseNdjsonChatLine", () => {
  it("parses citations with url and optional title", () => {
    const line = JSON.stringify({
      type: "citations",
      citations: [
        { url: "https://a.example/x", title: "A" },
        { url: "https://b.example" },
      ],
    });
    expect(parseNdjsonChatLine(line)).toEqual({
      type: "citations",
      citations: [
        { url: "https://a.example/x", title: "A" },
        { url: "https://b.example" },
      ],
    });
  });

  it("skips invalid citation entries", () => {
    const line = JSON.stringify({
      type: "citations",
      citations: [{ url: "https://ok.test" }, { foo: 1 }, null],
    });
    expect(parseNdjsonChatLine(line)).toEqual({
      type: "citations",
      citations: [{ url: "https://ok.test" }],
    });
  });
});
