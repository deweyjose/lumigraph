import { describe, expect, it } from "vitest";

import { normalizeCallbackUrl } from "./auth-callback";

describe("normalizeCallbackUrl", () => {
  it("keeps relative callback URLs", () => {
    expect(normalizeCallbackUrl("/drafts?tab=recent")).toBe(
      "/drafts?tab=recent"
    );
  });

  it("converts same-origin absolute URLs to relative paths", () => {
    expect(
      normalizeCallbackUrl(
        "https://lumigraph-preview.vercel.app/posts/new?foo=bar",
        "https://lumigraph-preview.vercel.app"
      )
    ).toBe("/posts/new?foo=bar");
  });

  it("drops cross-origin callback URLs to root", () => {
    expect(
      normalizeCallbackUrl(
        "https://evil.example.com/phish",
        "https://lumigraph-preview.vercel.app"
      )
    ).toBe("/");
  });
});
