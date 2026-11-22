import { describe, expect, it } from "vitest";
import { keepOrAdvanceRotationIndex, nextRotationIndex, type RotationMember } from "./rotation";

const m = (...ids: string[]): RotationMember[] => ids.map((id) => ({ profileId: id.replace("!", ""), active: !id.endsWith("!") }));

describe("nextRotationIndex", () => {
  it("cycles in order and wraps around", () => {
    const r = m("A", "B", "C");
    expect(nextRotationIndex(r, null)).toBe(0);
    expect(nextRotationIndex(r, 0)).toBe(1);
    expect(nextRotationIndex(r, 1)).toBe(2);
    expect(nextRotationIndex(r, 2)).toBe(0);
  });

  it("honours a start position for the first turn", () => {
    expect(nextRotationIndex(m("A", "B", "C"), null, 2)).toBe(2);
  });

  it("skips archived members (marked !)", () => {
    const r = m("A", "B!", "C");
    expect(nextRotationIndex(r, 0)).toBe(2);
    expect(nextRotationIndex(r, 2)).toBe(0);
    expect(nextRotationIndex(m("A!", "B"), null)).toBe(1);
  });

  it("handles a list that shrank since the last turn", () => {
    expect(nextRotationIndex(m("A", "B"), 4)).toBe(1); // (4 + 1) % 2
  });

  it("returns null when nobody can take it", () => {
    expect(nextRotationIndex([], null)).toBeNull();
    expect(nextRotationIndex(m("A!", "B!"), 0)).toBeNull();
  });

  it("works with a single member", () => {
    expect(nextRotationIndex(m("A"), 0)).toBe(0);
  });
});

describe("keepOrAdvanceRotationIndex", () => {
  it("keeps the current person if still active", () => {
    expect(keepOrAdvanceRotationIndex(m("A", "B", "C"), 1)).toBe(1);
  });

  it("moves to the next active person if the current one is gone", () => {
    expect(keepOrAdvanceRotationIndex(m("A", "B!", "C"), 1)).toBe(2);
    expect(keepOrAdvanceRotationIndex(m("A", "B"), 5)).toBe(1);
    expect(keepOrAdvanceRotationIndex(m("A", "B"), null)).toBe(0);
  });
});
