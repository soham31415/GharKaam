import { describe, expect, it } from "vitest";
import { safeNextPath } from "./session";

describe("safeNextPath", () => {
  it("keeps local paths", () => {
    expect(safeNextPath("/chores?mine=1")).toBe("/chores?mine=1");
  });

  it("falls back to the picker for anything else", () => {
    for (const bad of [undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "/unlock"]) {
      expect(safeNextPath(bad)).toBe("/profiles");
    }
  });
});
