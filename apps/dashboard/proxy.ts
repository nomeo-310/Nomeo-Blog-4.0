import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const COOKIE_PREFIX = "quilhub_dashboard";

const AUTH_COOKIES = [
  `${COOKIE_PREFIX}.session_token`,
  `${COOKIE_PREFIX}.session`,
  `${COOKIE_PREFIX}.session_data`,
  `__Secure-${COOKIE_PREFIX}.session_token`,
  `__Secure-${COOKIE_PREFIX}.session`,
];

function clearCookiesOnResponse(response: NextResponse) {
  AUTH_COOKIES.forEach((name) => {
    response.cookies.delete(name);
    response.cookies.set(name, "", { expires: new Date(0), path: "/" });
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  const session = getSessionCookie(request, {
    cookiePrefix: COOKIE_PREFIX,
  });

  // Already logged in — skip login page
  if (isLoginPage && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Not logged in — redirect to login
  if (!isLoginPage && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Excludes all of /api — every API route (including the CRON_SECRET-gated
  // /api/cron/* routes hit by an external scheduler with no session cookie)
  // already enforces its own auth server-side via requireAdminUserFromRequest
  // or a bearer-token check. Without this exclusion, this middleware saw no
  // session cookie on those requests and redirected them to /login before
  // the route handler — and its own auth check — ever ran.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};