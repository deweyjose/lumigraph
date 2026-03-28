import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, hasOpenAIApiKeyMock, generateNotesMock, refineNotesMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    hasOpenAIApiKeyMock: vi.fn(),
    generateNotesMock: vi.fn(),
    refineNotesMock: vi.fn(),
  }));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/ai/config", () => ({
  hasOpenAIApiKey: hasOpenAIApiKeyMock,
}));

vi.mock("@/server/services/integration-set-notes-assist", () => ({
  generateIntegrationSetNotes: generateNotesMock,
  refineIntegrationSetNotes: refineNotesMock,
}));

import { POST } from "./route";

const setId = "20000000-0000-4000-8000-000000000001";

describe("POST /api/integration-sets/:id/notes-assist", () => {
  beforeEach(() => {
    authMock.mockReset();
    hasOpenAIApiKeyMock.mockReset();
    generateNotesMock.mockReset();
    refineNotesMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue(null);
    hasOpenAIApiKeyMock.mockReturnValue(true);

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(401);
  });

  it("returns 503 when AI is not configured", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(false);

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(503);
  });

  it("calls generate path", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    generateNotesMock.mockResolvedValue({ notes: "Generated notes body." });

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(generateNotesMock).toHaveBeenCalledWith(setId, "user-1");
    expect(refineNotesMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      notes: "Generated notes body.",
    });
  });

  it("calls refine path", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    refineNotesMock.mockResolvedValue({ notes: "Refined." });

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "refine",
            notes: "Draft notes here",
          }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(refineNotesMock).toHaveBeenCalledWith(
      setId,
      "user-1",
      "Draft notes here"
    );
    expect(generateNotesMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ notes: "Refined." });
  });

  it("returns 404 when service throws not found", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    generateNotesMock.mockRejectedValue(new Error("Integration set not found"));

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns 502 on other generation errors", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    generateNotesMock.mockRejectedValue(new Error("OpenAI timeout"));

    const res = await POST(
      new Request(
        `http://localhost/api/integration-sets/${setId}/notes-assist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      ),
      { params: Promise.resolve({ id: setId }) }
    );

    expect(res.status).toBe(502);
  });
});
