import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, streamAstroHubChatMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  streamAstroHubChatMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/services/chat", () => ({
  streamAstroHubChat: streamAstroHubChatMock,
}));

import { POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    authMock.mockReset();
    streamAstroHubChatMock.mockReset();
  });

  it("returns 401 when not signed in", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "hi" }],
        }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns 400 for invalid body", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });

    const response = await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("streams NDJSON events for valid requests", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    streamAstroHubChatMock.mockReturnValue(
      (async function* () {
        yield { type: "text_delta", text: "Hello" };
        yield { type: "done" };
      })()
    );

    const response = await POST(
      new NextRequest("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say hi" }],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("ndjson");

    const text = await response.text();
    const lines = text.trim().split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(JSON.parse(lines[0]!)).toEqual({
      type: "text_delta",
      text: "Hello",
    });
    expect(JSON.parse(lines[1]!)).toEqual({ type: "done" });

    expect(streamAstroHubChatMock).toHaveBeenCalledWith([
      { role: "user", content: "Say hi" },
    ]);
  });
});
