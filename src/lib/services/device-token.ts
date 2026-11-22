/**
 * Signed "this device knows the family passcode" token, stored in an httpOnly
 * cookie. Pure Web Crypto so it runs in proxy.ts, server code and tests.
 *
 * Format: v1.<issuedAtMs base36>.<HMAC-SHA256 base64url>
 * The passcode is mixed into the signed message (not stored in the token), so
 * changing FAMILY_PASSCODE invalidates every device without touching SESSION_SECRET.
 */

const VERSION = "v1";
const encoder = new TextEncoder();

export const DEVICE_TOKEN_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function message(issued: string, passcode: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(`${VERSION}.${issued}.${passcode}`);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export async function createDeviceToken(secret: string, passcode: string, nowMs: number): Promise<string> {
  const issued = nowMs.toString(36);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), message(issued, passcode));
  return `${VERSION}.${issued}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyDeviceToken(
  token: string | undefined,
  secret: string,
  passcode: string,
  nowMs: number,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== VERSION) return false;
  const [, issued, sigText] = parts;

  const issuedMs = parseInt(issued, 36);
  if (!Number.isFinite(issuedMs) || issuedMs > nowMs + 60_000 || nowMs - issuedMs > DEVICE_TOKEN_MAX_AGE_MS) {
    return false;
  }

  const sig = fromBase64Url(sigText);
  if (!sig) return false;
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify("HMAC", await hmacKey(secret), sig, message(issued, passcode));
}

/** Constant-time passcode comparison (hash both sides so lengths match). */
export async function passcodeMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(input)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
