import { describe, expect, it } from "vitest";
import { categoryInputSchema, itemInputSchema, markBoughtSchema, quickAddSchema } from "./inventory";

const A = "11111111-1111-4111-8111-111111111111";

describe("itemInputSchema", () => {
  it("parses a full item with a restock schedule", () => {
    const r = itemInputSchema.parse({
      name: " Milk ",
      categoryId: A,
      unit: "L",
      usualQuantity: "1.5",
      notes: "",
      lastRestockedOn: "2026-11-20",
      repeat: "daily",
      interval: "2",
      weekdays: "MO", // belongs to another repeat kind: ignored
    });
    expect(r).toEqual({
      name: "Milk",
      categoryId: A,
      unit: "L",
      usualQuantity: "1.5",
      notes: null,
      spec: { kind: "daily", interval: 2, until: null },
      lastRestockedOn: "2026-11-20",
    });
  });

  it("treats empty optional fields as null and 'once' as no schedule", () => {
    const r = itemInputSchema.parse({ name: "Paracetamol", categoryId: "", usualQuantity: "", lastRestockedOn: "", repeat: "once" });
    expect(r).toMatchObject({ categoryId: null, unit: null, usualQuantity: null, lastRestockedOn: null, spec: { kind: "once" } });
  });

  it("rejects bad quantities, dates and rules", () => {
    const fails = (extra: Record<string, unknown>) => !itemInputSchema.safeParse({ name: "X", repeat: "once", ...extra }).success;
    expect(fails({ usualQuantity: "0" })).toBe(true);
    expect(fails({ usualQuantity: "-1" })).toBe(true);
    expect(fails({ usualQuantity: "1.234" })).toBe(true);
    expect(fails({ usualQuantity: "two" })).toBe(true);
    expect(fails({ usualQuantity: "0.25" })).toBe(false);
    expect(fails({ lastRestockedOn: "2026-02-30" })).toBe(true);
    expect(fails({ categoryId: "nope" })).toBe(true);
    expect(fails({ name: "  " })).toBe(true);
    expect(fails({ repeat: "custom", customRrule: "FREQ=DAILY;COUNT=3" })).toBe(true); // no COUNT for restocks
    expect(fails({ repeat: "weekly" })).toBe(true); // no weekday
  });
});

describe("markBoughtSchema", () => {
  it("accepts one id or many, and requires at least one", () => {
    expect(markBoughtSchema.parse({ ids: A }).ids).toEqual([A]);
    expect(markBoughtSchema.parse({ ids: [A, A], fromList: "true" })).toMatchObject({ ids: [A, A], fromList: true, quantity: null });
    expect(markBoughtSchema.safeParse({}).success).toBe(false);
    expect(markBoughtSchema.safeParse({ ids: "x" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("quickAdd needs a name", () => {
    expect(quickAddSchema.safeParse({ name: "" }).success).toBe(false);
    expect(quickAddSchema.parse({ name: "Batteries", categoryId: "" })).toEqual({ name: "Batteries", categoryId: null });
  });

  it("category order is an optional whole number", () => {
    expect(categoryInputSchema.parse({ name: "Snacks" }).sortOrder).toBeNull();
    expect(categoryInputSchema.parse({ name: "Snacks", sortOrder: "15" }).sortOrder).toBe(15);
    expect(categoryInputSchema.safeParse({ name: "Snacks", sortOrder: "1.5" }).success).toBe(false);
  });
});
