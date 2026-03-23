import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, streamChatDispatchMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  streamChatDispatchMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/chat/dispatch", () => ({
  streamChatDispatch: streamChatDispatchMock,
}));

import { POST } from "./route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    authMock.mockReset();
    streamChatDispatchMock.mockReset();
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
    vi.spyOn(console, "info").mockImplementation(() => {});
    authMock.mockResolvedValue({ user: { id: "u1" } });
    streamChatDispatchMock.mockReturnValue(
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

    expect(streamChatDispatchMock).toHaveBeenCalledWith(
      {
        surface: "astro_hub",
        messages: [{ role: "user", content: "Say hi" }],
      },
      expect.objectContaining({
        userId: "u1",
        chatRunId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        ),
      })
    );
  });
});
