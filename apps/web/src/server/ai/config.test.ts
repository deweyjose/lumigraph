import { afterEach, describe, expect, it } from "vitest";
import { getRequiredOpenAIApiKey, hasOpenAIApiKey } from "./config";

const originalApiKey = process.env.OPENAI_API_KEY;

describe("ai config", () => {
  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
      return;
    }

    process.env.OPENAI_API_KEY = originalApiKey;
  });

  it("detects whether OPENAI_API_KEY is configured", () => {
    delete process.env.OPENAI_API_KEY;
    expect(hasOpenAIApiKey()).toBe(false);

    process.env.OPENAI_API_KEY = " test-key ";
    expect(hasOpenAIApiKey()).toBe(true);
  });

  it("returns the trimmed API key when present", () => {
    process.env.OPENAI_API_KEY = " test-key ";

    expect(getRequiredOpenAIApiKey()).toBe("test-key");
  });

  it("throws when the API key is missing", () => {
    delete process.env.OPENAI_API_KEY;

    expect(() => getRequiredOpenAIApiKey()).toThrow(
      "OPENAI_API_KEY not configured"
    );
  });
});
