import { describe, expect, it } from "vitest";
import { getPostSaveNavigation } from "./post-save-navigation";

describe("getPostSaveNavigation", () => {
  it("refreshes when the saved slug is unchanged", () => {
    expect(getPostSaveNavigation("m31", "m31")).toBe("refresh");
  });

  it("replaces the route when the saved slug changes", () => {
    expect(getPostSaveNavigation("m31", "m31-andromeda")).toEqual({
      replace: "/posts/m31-andromeda",
    });
  });

  it("uses the edit path when mode is edit", () => {
    expect(
      getPostSaveNavigation("m31", "m31-andromeda", { mode: "edit" })
    ).toEqual({
      replace: "/posts/m31-andromeda/edit",
    });
  });
});
