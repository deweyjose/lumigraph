import { z } from "zod";
import { describe, expect, it } from "vitest";
import { apiError, apiValidationError } from "./api-responses";

describe("api responses", () => {
  it("returns a machine-friendly error envelope", async () => {
    const response = apiError(404, "NOT_FOUND", "Post not found", {
      resource: "post",
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      code: "NOT_FOUND",
      message: "Post not found",
      resource: "post",
    });
  });

  it("formats zod validation errors consistently", async () => {
    const schema = z.object({
      id: z.string().uuid(),
      title: z.string().min(3),
    });
    const parsed = schema.safeParse({ id: "bad-id", title: "x" });

    expect(parsed.success).toBe(false);
    if (parsed.success) {
      throw new Error("Expected validation failure");
    }

    const response = apiValidationError(parsed.error);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: "VALIDATION_ERROR",
      message:
        "Invalid UUID; Too small: expected string to have >=3 characters",
    });
  });
});
