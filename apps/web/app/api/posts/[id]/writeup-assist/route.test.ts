import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  hasOpenAIApiKeyMock,
  getPostForOwnerMock,
  generateFromInterviewMock,
  refineMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  hasOpenAIApiKeyMock: vi.fn(),
  getPostForOwnerMock: vi.fn(),
  generateFromInterviewMock: vi.fn(),
  refineMock: vi.fn(),
}));

vi.mock("auth", () => ({
  auth: authMock,
}));

vi.mock("@/server/ai/config", () => ({
  hasOpenAIApiKey: hasOpenAIApiKeyMock,
}));

vi.mock("@/server/services/posts", () => ({
  getPostForOwner: getPostForOwnerMock,
}));

vi.mock("@/server/services/post-writeup-assist", () => ({
  generatePostWriteupFromInterview: generateFromInterviewMock,
  refinePostWriteup: refineMock,
}));

import { POST } from "./route";

const postFixture = {
  id: "post-1",
  title: "M31 Under City Skies",
  description: null,
  targetName: "M31",
  targetType: "GALAXY",
  captureDate: null,
  bortle: 7,
};

const validAnswers = {
  targetFocus: "M31",
  captureStory: "Utah dark site, March 2025",
  gearTechnique: "80mm refractor",
  processingAngle: "Gradient removal",
  readerTakeaway: "Dust lanes",
  tone: "Technical",
};

describe("POST /api/posts/:id/writeup-assist", () => {
  beforeEach(() => {
    authMock.mockReset();
    hasOpenAIApiKeyMock.mockReset();
    getPostForOwnerMock.mockReset();
    generateFromInterviewMock.mockReset();
    refineMock.mockReset();
  });

  it("returns 401 for unauthenticated callers", async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers: validAnswers,
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("returns 503 when OPENAI_API_KEY is not configured", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers: validAnswers,
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "AI_UNAVAILABLE",
    });
  });

  it("returns 404 when post is not owned", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    getPostForOwnerMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers: validAnswers,
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns generated write-up from interview answers", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    getPostForOwnerMock.mockResolvedValue(postFixture);
    generateFromInterviewMock.mockResolvedValue({
      description: "A polished description",
    });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers: validAnswers,
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      description: "A polished description",
    });
    expect(generateFromInterviewMock).toHaveBeenCalledOnce();
  });

  it("returns refined write-up when action is refine", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);
    getPostForOwnerMock.mockResolvedValue(postFixture);
    refineMock.mockResolvedValue({
      description: "Refined text",
    });

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine",
          description: "Some draft text",
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      description: "Refined text",
    });
    expect(refineMock).toHaveBeenCalledOnce();
    expect(generateFromInterviewMock).not.toHaveBeenCalled();
  });

  it("returns 400 when required interview answers are missing", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    hasOpenAIApiKeyMock.mockReturnValue(true);

    const response = await POST(
      new Request("http://localhost/api/posts/post-1/writeup-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          answers: { ...validAnswers, targetFocus: "   " },
        }),
      }),
      { params: Promise.resolve({ id: "post-1" }) }
    );

    expect(response.status).toBe(400);
  });
});
