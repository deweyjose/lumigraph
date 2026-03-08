import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPrismaMock } = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
}));

vi.mock("@lumigraph/db", () => ({
  getPrisma: getPrismaMock,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    getPrismaMock.mockReset();
  });

  it("returns health details when dependencies are available", async () => {
    getPrismaMock.mockResolvedValue({
      user: {
        count: vi.fn().mockResolvedValue(3),
      },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      db: "connected",
      userCount: 3,
    });
  });

  it("returns a standard error envelope on failure", async () => {
    getPrismaMock.mockRejectedValue(new Error("database unavailable"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "database unavailable",
      status: "error",
      db: "disconnected",
    });
  });
});
