import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy (Next.js 16 middleware) — route protection + account-status enforcement.
 *
 * Adapted for Nomeo:
 *   - Cookie prefix is "nomeo" (matches advanced.cookiePrefix in auth.ts).
 *   - Account status lives on Profile.banStatus ("active" | "banned" |
 *     "shadow_banned") — NOT the old activeStatus/deactivated fields.
 *   - "shadow_banned" users are deliberately allowed through everywhere;
 *     the whole point is they don't know. Only "banned" is blocked.
 *
 * Two jobs:
 *   1. Gate /dashboard behind a session (redirect to "/" with callbackUrl
 *      when signed out).
 *   2. For signed-in users on protected pages, check Profile.banStatus via
 *      /api/auth/check-status and, if banned, clear cookies and bounce home
 *      with an ?error flag the sign-in modal can read.
 *
 * NOTE: middleware runs on the Edge runtime, so it can't use mongoose
 * directly. It calls the /api/auth/check-status route (Node runtime) instead.
 */

const COOKIE_PREFIX = "nomeo_client";

// Cookie names better-auth may set, across secure/non-secure variants.
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

interface ProfileStatus {
  banStatus?: "active" | "banned" | "shadow_banned";
}

async function checkProfileStatus(request: NextRequest): Promise<ProfileStatus | null> {
  try {
    const statusUrl = new URL("/api/auth/check-status", request.url);
    const res = await fetch(statusUrl.toString(), {
      headers: { Cookie: request.headers.get("cookie") || "" },
    });
    if (res.ok) return (await res.json()) as ProfileStatus;
    return null;
  } catch {
    return null;
  }
}

/** Map a blocked status to the error code the sign-in modal understands. */
function getErrorCode(status: ProfileStatus): string | null {
  if (status.banStatus === "banned") return "account_banned";
  // shadow_banned is intentionally NOT blocked here.
  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = getSessionCookie(request, { cookiePrefix: COOKIE_PREFIX });

  // Signed-in user on a protected page → verify account standing.
  if (
    session &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/auth") &&
    pathname !== "/"
  ) {
    const status = await checkProfileStatus(request);

    // Banned → clear cookies and bounce home with an error flag.
    if (status && getErrorCode(status)) {
      const response = NextResponse.redirect(
        new URL(`/?error=${getErrorCode(status)}`, request.url)
      );
      return clearCookiesOnResponse(response);
    }

    // On the dashboard but we couldn't confirm a profile at all → sign out.
    if (pathname.startsWith("/dashboard") && !status) {
      const response = NextResponse.redirect(new URL("/", request.url));
      return clearCookiesOnResponse(response);
    }
  }

  // No session on the dashboard → send to home with a callback so we can
  // return them after they sign in.
  if (!session && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};