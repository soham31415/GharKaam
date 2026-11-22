import { describe, expect, it } from "vitest";
import { initialOf, toneIndex, turnLabel, turnOrder } from "./people";

describe("toneIndex", () => {
  it("follows family order and wraps after six colours", () => {
    const family = ["a", "b", "c", "d", "e", "f", "g"];
    expect(family.map((id) => toneIndex(id, family))).toEqual([0, 1, 2, 3, 4, 5, 0]);
  });
  it("gives unknown people a stable colour", () => {
    expect(toneIndex("zz", [])).toBe(toneIndex("zz", ["a"]));
  });
});

describe("initialOf", () => {
  it("takes the first letter, upper-cased", () => {
    expect(initialOf(" rohan")).toBe("R");
    expect(initialOf("Ādi")).toBe("Ā");
    expect(initialOf("")).toBe("?");
  });
});

describe("turns", () => {
  it("labels positions", () => {
    expect([1, 2, 3, 4, 11, 22].map((n) => turnLabel(n))).toEqual(["1st turn", "2nd", "3rd", "4th", "11th", "22nd"]);
    expect(turnLabel(1, false)).toBe("1st");
  });
  it("orders ticked people in family order from the chosen first turn", () => {
    const family = ["mom", "dad", "rohan", "priya"];
    expect([...turnOrder(family, ["priya", "mom", "rohan"], null)]).toEqual([
      ["mom", 1],
      ["rohan", 2],
      ["priya", 3],
    ]);
    expect(Object.fromEntries(turnOrder(family, ["priya", "mom", "rohan"], "rohan"))).toEqual({ rohan: 1, priya: 2, mom: 3 });
    expect(Object.fromEntries(turnOrder(family, ["mom"], "dad"))).toEqual({ mom: 1 });
  });
});
