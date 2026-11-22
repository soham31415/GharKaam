import { NextResponse, type NextRequest } from "next/server";
import { DEVICE_COOKIE, PUBLIC_PATH_PREFIXES } from "@/lib/config";
import { verifyDeviceToken } from "@/lib/services/device-token";

/**
 * Family passcode gate: any request without a valid device cookie goes to
 * /unlock. Optimistic check only — pages and actions verify again server-side.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const passcode = process.env.FAMILY_PASSCODE;
  const secret = process.env.SESSION_SECRET;
  if (!passcode || !secret) {
    return new NextResponse("Server is missing FAMILY_PASSCODE or SESSION_SECRET. See .env.example.", {
      status: 500,
    });
  }

  const token = request.cookies.get(DEVICE_COOKIE)?.value;
  if (await verifyDeviceToken(token, secret, passcode, Date.now())) {
    return NextResponse.next();
  }

  // Server action / fetch calls can't follow a redirect to an HTML page usefully.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Locked. Enter the family passcode first.", { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip static assets entirely; the public-path list above handles the rest.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)"],
};
