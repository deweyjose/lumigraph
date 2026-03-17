import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock("../../../../src/server/password-reset", () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

import { POST } from "./route";

describe("POST /api/auth/forgot-password", () => {
  const originalEmailServer = process.env.EMAIL_SERVER;
  const originalEmailFrom = process.env.EMAIL_FROM;

  beforeEach(() => {
    requestPasswordResetMock.mockReset();
    if (originalEmailServer === undefined) {
      delete process.env.EMAIL_SERVER;
    } else {
      process.env.EMAIL_SERVER = originalEmailServer;
    }
    if (originalEmailFrom === undefined) {
      delete process.env.EMAIL_FROM;
    } else {
      process.env.EMAIL_FROM = originalEmailFrom;
    }
  });

  it("returns 501 when email auth is not configured", async () => {
    delete process.env.EMAIL_SERVER;
    delete process.env.EMAIL_FROM;

    const response = await POST(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "astro@example.com" }),
      })
    );

    expect(response.status).toBe(501);
    await expect(response.json()).resolves.toMatchObject({
      code: "NOT_IMPLEMENTED",
    });
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  it("requests a password reset when email auth is configured", async () => {
    process.env.EMAIL_SERVER = "smtp://resend:token@smtp.resend.com:587";
    process.env.EMAIL_FROM = "Lumigraph <onboarding@resend.dev>";

    const response = await POST(
      new NextRequest("http://localhost/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "astro@example.com" }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message:
        "If an account exists for that email, we sent a link to reset your password.",
    });
    expect(requestPasswordResetMock).toHaveBeenCalledWith("astro@example.com");
  });
});
