import { describe, expect, it } from "vitest";
import { resolveCallbackBaseUrl } from "./local-dev-callback-origin";

describe("resolveCallbackBaseUrl", () => {
  it("uses request origin by default", () => {
    process.env.AWS_LAMBDA_ENDPOINT = "";

    expect(
      resolveCallbackBaseUrl("http://localhost:3000/", {
        localDevOverride: "http://host.docker.internal:3000",
      })
    ).toBe("http://localhost:3000");
  });

  it("uses local dev override for local lambda endpoints", () => {
    process.env.AWS_LAMBDA_ENDPOINT = "http://localhost:4566";

    expect(
      resolveCallbackBaseUrl("http://localhost:3000", {
        localDevOverride: "http://host.docker.internal:3000/",
      })
    ).toBe("http://host.docker.internal:3000");
  });

  it("returns null when neither request origin nor applicable override exists", () => {
    process.env.AWS_LAMBDA_ENDPOINT = "";

    expect(
      resolveCallbackBaseUrl(undefined, {
        localDevOverride: "http://host.docker.internal:3000",
      })
    ).toBeNull();
  });
});
