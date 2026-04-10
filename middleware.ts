import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/login",
  "/signup",
  "/api/auth",
  "/api/public",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for session cookie. Better Auth prefixes cookies with "__Secure-"
  // on HTTPS; check both forms plus the legacy fallback.
  const sessionCookie =
    request.cookies.get("__Secure-luxifit-client.session_token") ??
    request.cookies.get("luxifit-client.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
