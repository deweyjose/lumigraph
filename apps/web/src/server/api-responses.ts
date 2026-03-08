import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    details ? { code, message, ...details } : { code, message },
    { status }
  );
}

export function apiValidationError(error: ZodError, status = 400) {
  return apiError(
    status,
    "VALIDATION_ERROR",
    error.issues.map((issue) => issue.message).join("; ")
  );
}
