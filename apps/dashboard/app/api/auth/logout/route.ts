import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/connect-to-database";
import { AdminLog, AdminAction, AdminLogSeverity } from "@/models/admin-log";
import { getAuth } from "@/lib/auth";
import { requireAdminUserFromRequest } from "@/lib/session";
import { getAdminRole } from "@/lib/admin-role";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const auth = await getAuth();

    // Best-effort audit — never blocks logout
    const admin = await requireAdminUserFromRequest(request.headers).catch(() => null);

    if (admin) {
      try {
        const adminRole = getAdminRole(admin.role);
        if (adminRole) {
          await AdminLog.logAction({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.displayName || admin.name,
            adminRole,
            action: AdminAction.LOGOUT,
            severity: AdminLogSeverity.INFO,
            details: `Admin ${admin.displayName || admin.name} logged out`,
            ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
            userAgent: request.headers.get("user-agent") ?? "unknown",
            endpoint: "/api/auth/logout",
            method: "POST",
            status: "success",
            metadata: {},
          });
        }
      } catch (logError) {
        console.error("Failed to write logout audit log:", logError);
      }
    }

    // Derive the correct base URL from the incoming request itself —
    // this works regardless of whether you're on port 3000, 3001, or production.
    const origin = request.nextUrl.origin; // e.g. "http://localhost:3001"
    const signOutUrl = `${origin}/api/auth/sign-out`;

    // Forward the original headers (cookies) so better-auth can find the session
    const signOutResponse = await auth.handler(
      new Request(signOutUrl, {
        method: "POST",
        headers: request.headers,
      })
    );

    const response = NextResponse.json({ success: true }, { status: 200 });

    // Copy Set-Cookie from better-auth so the session cookie is cleared on the client
    signOutResponse.headers.forEach((value: string, key: string) => {
      response.headers.append(key, value);
    });

    return response;

  } catch (error) {
    console.error("Logout error:", error);
    // Always return success — client must clear state regardless of server errors
    return NextResponse.json({ success: true }, { status: 200 });
  }
}