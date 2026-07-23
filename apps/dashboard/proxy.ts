import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const COOKIE_PREFIX = "nomeo_dashboard";

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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};