const PREFIX = "[chat]";

/** Extra detail (e.g. stack traces) when `LUMIGRAPH_CHAT_DEBUG=1`. */
export function isChatDebugEnabled(): boolean {
  const v = process.env.LUMIGRAPH_CHAT_DEBUG;
  return v === "1" || v === "true";
}

export function chatInfo(meta: Record<string, unknown>): void {
  console.info(PREFIX, meta);
}

export function chatWarn(meta: Record<string, unknown>): void {
  console.warn(PREFIX, meta);
}

export function chatError(meta: Record<string, unknown>): void {
  console.error(PREFIX, meta);
}

/** Logs only when `LUMIGRAPH_CHAT_DEBUG` is set; optional error stack. */
export function chatDebug(meta: Record<string, unknown>, err?: unknown): void {
  if (!isChatDebugEnabled()) return;
  const payload: Record<string, unknown> = { ...meta };
  if (err instanceof Error && err.stack) {
    payload.stack = err.stack;
  }
  console.info(`${PREFIX}:debug`, payload);
}
