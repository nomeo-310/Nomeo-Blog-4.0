// app/api/errors/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { logError } from "@/lib/log-error";

export const dynamic = "force-dynamic";

/**
 * POST /api/errors
 * -----------------
 * Receives client-side error reports — from the error.tsx/global-error.tsx
 * boundaries and the window-level error/unhandledrejection listener (see
 * components/error-tracking.tsx). Deliberately unauthenticated: an error on
 * the login page, or thrown before a session resolves, still needs to be
 * captured. Always 200s — a malformed report shouldn't surface as a second
 * error to a client that's already failing.
 */
export async function POST(req: NextRequest) {
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

  const admin = await getCurrentUser().catch(() => null);

  await logError({
    source: "frontend",
    errorCode,
    message,
    stack: typeof body.stack === "string" ? body.stack : undefined,
    url: typeof body.url === "string" ? body.url : undefined,
    userId: admin?.id ?? null,
    userRole: admin?.role,
    clientContext: body.clientContext,
  });

  return NextResponse.json({ ok: true });
}
