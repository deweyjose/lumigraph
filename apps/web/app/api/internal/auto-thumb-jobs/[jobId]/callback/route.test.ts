import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  applyAutoThumbJobCallbackMock,
  verifyAutoThumbJobCallbackSignatureMock,
} = vi.hoisted(() => ({
  applyAutoThumbJobCallbackMock: vi.fn(),
  verifyAutoThumbJobCallbackSignatureMock: vi.fn(),
}));

vi.mock("@/server/services/auto-thumb-runtime", () => ({
  applyAutoThumbJobCallback: applyAutoThumbJobCallbackMock,
  verifyAutoThumbJobCallbackSignature: verifyAutoThumbJobCallbackSignatureMock,
}));

import { POST } from "./route";

describe("POST /api/internal/auto-thumb-jobs/[jobId]/callback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INTERNAL_CALLBACK_SECRET: "secret-1",
    };
    applyAutoThumbJobCallbackMock.mockReset();
    verifyAutoThumbJobCallbackSignatureMock.mockReset();
    verifyAutoThumbJobCallbackSignatureMock.mockReturnValue(true);
  });

  it("returns 500 when callback secret is not configured", async () => {
    delete process.env.INTERNAL_CALLBACK_SECRET;

    const response = await POST(
      new Request(
        "http://localhost/api/internal/auto-thumb-jobs/job/callback",
        {
          method: "POST",
        }
      ),
      {
        params: Promise.resolve({
          jobId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "SERVER_ERROR",
    });
  });

  it("returns 401 when signature metadata is missing", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/internal/auto-thumb-jobs/11111111-1111-4111-8111-111111111111/callback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "RUNNING" }),
        }
      ),
      {
        params: Promise.resolve({
          jobId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Missing callback signature headers",
    });
  });

  it("returns 401 when signature verification fails", async () => {
    verifyAutoThumbJobCallbackSignatureMock.mockReturnValue(false);

    const response = await POST(
      new Request(
        "http://localhost/api/internal/auto-thumb-jobs/11111111-1111-4111-8111-111111111111/callback?ts=1&sig=deadbeef",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "RUNNING" }),
        }
      ),
      {
        params: Promise.resolve({
          jobId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid callback signature",
    });
  });

  it("returns 400 when payload validation fails", async () => {
    const response = await POST(
      new Request(
        "http://localhost/api/internal/auto-thumb-jobs/11111111-1111-4111-8111-111111111111/callback?ts=1&sig=deadbeef",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "READY" }),
        }
      ),
      {
        params: Promise.resolve({
          jobId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("applies callback payload and returns success", async () => {
    applyAutoThumbJobCallbackMock.mockResolvedValue({ ok: true });

    const response = await POST(
      new Request(
        "http://localhost/api/internal/auto-thumb-jobs/11111111-1111-4111-8111-111111111111/callback?ts=1&sig=deadbeef",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "READY",
            outputThumbKey:
              "users/user-1/posts/post-1/final/thumbs/11111111-1111-4111-8111-111111111111.webp",
          }),
        }
      ),
      {
        params: Promise.resolve({
          jobId: "11111111-1111-4111-8111-111111111111",
        }),
      }
    );

    expect(applyAutoThumbJobCallbackMock).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      {
        status: "READY",
        outputThumbKey:
          "users/user-1/posts/post-1/final/thumbs/11111111-1111-4111-8111-111111111111.webp",
      },
      {
        requestOrigin: "http://localhost",
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
