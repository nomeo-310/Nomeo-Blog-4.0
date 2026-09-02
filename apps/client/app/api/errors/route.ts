// app/api/errors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { logError } from "@/lib/log-error";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/errors
 * -----------------
 * Receives client-side error reports — from the error.tsx/global-error.tsx
 * boundaries and the window-level error/unhandledrejection listener (see
 * components/error-tracking.tsx). Deliberately unauthenticated: an error on
 * the sign-in page, or thrown before a session resolves, still needs to be
 * captured. Always 200s — a malformed report shouldn't surface as a second
 * error to a client that's already failing.
 */
export async function POST(req: NextRequest) {
  // Best-effort cap, not a hard gate — this route must never surface a
  // failure of its own, so an over-limit report is silently dropped rather
  // than returned as a 429 (the client can't act on it anyway; most calls
  // arrive via sendBeacon, which doesn't read the response).
  const ip = getClientIp(req);
  const { allowed } = await rateLimit({ key: `errors:${ip}`, limit: 20, windowSeconds: 60 });
  if (!allowed) return NextResponse.json({ ok: true });

  let body: {
    errorCode?: string;
    message?: string;
    stack?: string;
    url?: string;
    clientContext?: { userAgent?: string; browser?: string; os?: string; screenSize?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const message = typeof body.message === "string" && body.message.trim() ? body.message : "Unknown client error";
  const errorCode = typeof body.errorCode === "string" && body.errorCode.trim() ? body.errorCode : "UNKNOWN_ERROR";

  const user = await getCurrentUser().catch(() => null);

  await logError({
    source: "frontend",
    errorCode,
    message,
    stack: typeof body.stack === "string" ? body.stack : undefined,
    url: typeof body.url === "string" ? body.url : undefined,
    userId: user?.id ?? null,
    userRole: user?.role,
    clientContext: body.clientContext,
  });

  return NextResponse.json({ ok: true });
}
