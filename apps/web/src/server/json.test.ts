import { describe, expect, it } from "vitest";
import { toJsonSafe } from "./json";

describe("toJsonSafe", () => {
  it("converts nested BigInt values into numbers", () => {
    const input = {
      id: "post-1",
      sizeBytes: BigInt(1234),
      nested: {
        values: [BigInt(2), { sizeBytes: BigInt(8) }],
      },
    };

    expect(toJsonSafe(input)).toEqual({
      id: "post-1",
      sizeBytes: 1234,
      nested: {
        values: [2, { sizeBytes: 8 }],
      },
    });
  });

  it("matches JSON serialization behavior for dates", () => {
    const input = { createdAt: new Date("2026-03-07T00:00:00.000Z") };

    expect(toJsonSafe(input)).toEqual({
      createdAt: "2026-03-07T00:00:00.000Z",
    });
  });
});
