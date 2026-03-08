/**
 * Converts Prisma payloads with BigInt values into JSON-safe data.
 */
export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? Number(item) : item
    )
  ) as T;
}
