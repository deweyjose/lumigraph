import { describe, expect, it } from "vitest";
import { chatRequestBodySchema } from "./schemas";

describe("chatRequestBodySchema", () => {
  it("defaults surface to astro_hub when omitted", () => {
    const parsed = chatRequestBodySchema.parse({
      messages: [{ role: "user", content: "hi" }],
    });
    expect(parsed.surface).toBe("astro_hub");
    expect(parsed.messages).toHaveLength(1);
  });

  it("accepts explicit surface and optional context", () => {
    const parsed = chatRequestBodySchema.parse({
      surface: "astro_hub",
      messages: [{ role: "user", content: "hi" }],
      context: { postId: "abc" },
    });
    expect(parsed.context).toEqual({ postId: "abc" });
  });
});
