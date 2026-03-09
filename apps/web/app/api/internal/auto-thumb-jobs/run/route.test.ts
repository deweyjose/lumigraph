import { beforeEach, describe, expect, it, vi } from "vitest";

const { runAutoThumbWorkerBatchMock } = vi.hoisted(() => ({
  runAutoThumbWorkerBatchMock: vi.fn(),
}));

vi.mock("@/server/services/auto-thumb-worker", () => ({
  runAutoThumbWorkerBatch: runAutoThumbWorkerBatchMock,
}));

import { POST } from "./route";

describe("POST /api/internal/auto-thumb-jobs/run", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTO_THUMB_WORKER_SECRET: "secret-1",
    };
    runAutoThumbWorkerBatchMock.mockReset();
  });

  it("returns 500 when the worker secret is not configured", async () => {
    delete process.env.AUTO_THUMB_WORKER_SECRET;

    const response = await POST(
      new Request("http://localhost/api/internal/auto-thumb-jobs/run", {
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "SERVER_ERROR",
    });
  });

  it("returns 401 when secret header is missing or invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/auto-thumb-jobs/run", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: "UNAUTHORIZED",
      message: "Invalid worker secret",
    });
  });

  it("returns 400 when body validation fails", async () => {
    const response = await POST(
      new Request("http://localhost/api/internal/auto-thumb-jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lumigraph-worker-secret": "secret-1",
        },
        body: JSON.stringify({ limit: -1 }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("runs the worker and returns summary on success", async () => {
    runAutoThumbWorkerBatchMock.mockResolvedValue({
      requested: 2,
      processed: 1,
      alreadyReady: 0,
      retryScheduled: 1,
      failed: 0,
      skipped: 0,
      results: [],
    });

    const response = await POST(
      new Request("http://localhost/api/internal/auto-thumb-jobs/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lumigraph-worker-secret": "secret-1",
        },
        body: JSON.stringify({ limit: 2, maxAttempts: 4 }),
      })
    );

    expect(runAutoThumbWorkerBatchMock).toHaveBeenCalledWith({
      limit: 2,
      maxAttempts: 4,
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      requested: 2,
      processed: 1,
      retryScheduled: 1,
    });
  });
});
