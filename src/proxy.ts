import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Next.js 16 "proxy" (was "middleware"). Fast check: is there a session cookie?
// It does NOT verify the session; protected pages also check with auth.api.getSession().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Pages that need a logged-in user
export const config = {
  matcher: ["/dashboard/:path*", "/team/:path*", "/settings/:path*", "/onboarding"],
};
