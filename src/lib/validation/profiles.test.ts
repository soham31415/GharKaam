import { describe, expect, it } from "vitest";
import { formToObject } from "./form";
import { createProfileSchema, profileInputSchema, profileUpdateSchema } from "./profiles";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

describe("profile validation", () => {
  it("treats a missing checkbox as false and a ticked one as true", () => {
    expect(createProfileSchema.parse(formToObject(fd({ name: "Rohan" }))).isAdmin).toBe(false);
    expect(createProfileSchema.parse(formToObject(fd({ name: "Mom", isAdmin: "on" }))).isAdmin).toBe(true);
  });

  it("trims the name and turns an empty or missing avatar into null", () => {
    expect(profileInputSchema.parse(formToObject(fd({ name: "  Dad  ", avatar: "  " })))).toEqual({
      name: "Dad",
      avatar: null,
    });
    expect(profileInputSchema.parse({ name: "Dad" }).avatar).toBeNull();
  });

  it("rejects an empty name and a bad id", () => {
    expect(profileInputSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ id: "nope", name: "Dad" }).success).toBe(false);
  });

  it("ignores Next.js internal form fields", () => {
    expect(formToObject(fd({ $ACTION_ID_abc: "", name: "x" }))).toEqual({ name: "x" });
  });
});
