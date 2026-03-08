import { z } from "zod";

export type ToolContext = {
  userId: string;
};

export type ToolErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "SERVER_ERROR";

export type ToolResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      code: ToolErrorCode;
      message: string;
    };

export type ToolDefinition<
  Name extends string = string,
  Schema extends z.ZodTypeAny = z.ZodTypeAny,
  Output = unknown,
> = {
  name: Name;
  description: string;
  inputSchema: Schema;
  execute: (
    context: ToolContext,
    input: z.infer<Schema>
  ) => Promise<ToolResult<Output>>;
};

export function defineTool<
  Name extends string,
  Schema extends z.ZodTypeAny,
  Output,
>(tool: ToolDefinition<Name, Schema, Output>) {
  return tool;
}

export function toolOk<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function toolError(
  code: ToolErrorCode,
  message: string
): ToolResult<never> {
  return { ok: false, code, message };
}

export async function executeTool<Schema extends z.ZodTypeAny, Output>(
  tool: ToolDefinition<string, Schema, Output>,
  context: ToolContext,
  rawInput: unknown
): Promise<ToolResult<Output>> {
  const parsed = tool.inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return toolError(
      "VALIDATION_ERROR",
      parsed.error.issues.map((issue) => issue.message).join("; ")
    );
  }

  try {
    return await tool.execute(context, parsed.data);
  } catch (error) {
    return toolError(
      "SERVER_ERROR",
      error instanceof Error ? error.message : "Tool execution failed"
    );
  }
}
