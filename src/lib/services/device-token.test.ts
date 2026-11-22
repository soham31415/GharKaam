import { describe, expect, it } from "vitest";
import { createDeviceToken, DEVICE_TOKEN_MAX_AGE_MS, passcodeMatches, verifyDeviceToken } from "./device-token";

const SECRET = "x".repeat(40);
const PASS = "family-pass";
const NOW = Date.UTC(2026, 10, 22, 4, 0, 0);

describe("device token", () => {
  it("verifies a token it created", async () => {
    const token = await createDeviceToken(SECRET, PASS, NOW);
    expect(await verifyDeviceToken(token, SECRET, PASS, NOW + 1000)).toBe(true);
  });

  it("rejects when the passcode changed", async () => {
    const token = await createDeviceToken(SECRET, PASS, NOW);
    expect(await verifyDeviceToken(token, SECRET, "new-pass", NOW)).toBe(false);
  });

  it("rejects when the secret changed", async () => {
    const token = await createDeviceToken(SECRET, PASS, NOW);
    expect(await verifyDeviceToken(token, "y".repeat(40), PASS, NOW)).toBe(false);
  });

  it("rejects tampered timestamps and signatures", async () => {
    const token = await createDeviceToken(SECRET, PASS, NOW);
    const [v, issued, sig] = token.split(".");
    const otherIssued = (parseInt(issued, 36) + 1).toString(36);
    expect(await verifyDeviceToken(`${v}.${otherIssued}.${sig}`, SECRET, PASS, NOW)).toBe(false);
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(await verifyDeviceToken(`${v}.${issued}.${flipped}`, SECRET, PASS, NOW)).toBe(false);
  });

  it("rejects garbage and missing tokens", async () => {
    for (const t of [undefined, "", "v1", "v1.abc", "v2.abc.def", "v1.zz.!!!", "a.b.c.d"]) {
      expect(await verifyDeviceToken(t, SECRET, PASS, NOW)).toBe(false);
    }
  });

  it("expires after the max age and rejects tokens from the future", async () => {
    const token = await createDeviceToken(SECRET, PASS, NOW);
    expect(await verifyDeviceToken(token, SECRET, PASS, NOW + DEVICE_TOKEN_MAX_AGE_MS - 1)).toBe(true);
    expect(await verifyDeviceToken(token, SECRET, PASS, NOW + DEVICE_TOKEN_MAX_AGE_MS + 1)).toBe(false);
    const future = await createDeviceToken(SECRET, PASS, NOW + 10 * 60_000);
    expect(await verifyDeviceToken(future, SECRET, PASS, NOW)).toBe(false);
  });
});

describe("passcodeMatches", () => {
  it("matches only the exact passcode", async () => {
    expect(await passcodeMatches("family-pass", "family-pass")).toBe(true);
    expect(await passcodeMatches("family-pas", "family-pass")).toBe(false);
    expect(await passcodeMatches("Family-pass", "family-pass")).toBe(false);
    expect(await passcodeMatches("", "family-pass")).toBe(false);
  });
});
