// app/api/auth/admin-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { connectDB } from "@/lib/connect-to-database";
import { Seedphrase } from "@/models/seed-phrase";
import { Admin } from "@/models/admin";
import { User } from "@/models/user";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { verifyPassword } from "better-auth/crypto";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password, seedphrase } = await request.json();

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }
    if (!seedphrase?.trim()) {
      return NextResponse.json({ error: "Seed phrase is required" }, { status: 400 });
    }

    // STEP 1: Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      await logFailedAttempt(email, null, "USER_NOT_FOUND", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // STEP 2: Verify user has an admin role
    if (!["super_admin", "admin", "support"].includes(user.role)) {
      await logFailedAttempt(email, user._id, "UNAUTHORIZED_ROLE", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // STEP 3: Verify admin record
    const admin = await Admin.findOne({ userId: user._id });
    if (!admin) {
      await logFailedAttempt(email, user._id, "ADMIN_NOT_FOUND", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // Check if this is a new account that needs onboarding
    // A new account needs onboarding when:
    // 1. isActive is false AND isOnboarded is false (regardless of adminStatus)
    // 2. OR adminStatus is "active" but isActive is false (pre-onboarding state)
    const needsOnboarding = !admin.isActive && !admin.isOnboarded;
    
    // Check if account is deactivated (should NOT be allowed to login)
    // Account is deactivated if:
    // 1. isActive is false AND isOnboarded is true (was activated before, now deactivated)
    // 2. OR adminStatus is "inactive" or "suspended" AND isOnboarded is true
    const isDeactivated = !admin.isActive && admin.isOnboarded;
    
    // Block login only for deactivated accounts
    if (isDeactivated) {
      await logFailedAttempt(email, user._id, "ADMIN_DEACTIVATED", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Account has been deactivated. Please contact support." },
        { status: 401 }
      );
    }
    
    // Allow login for:
    // - Active accounts (isActive = true)
    // - New accounts needing onboarding (isActive = false, isOnboarded = false)
    // This covers both scenarios where adminStatus might be "active" or "inactive" before onboarding

    // STEP 4: Verify password directly against the account record hash
    const auth = await getAuth();
    const db = mongoose.connection.db!;

    const accountRecord = await db.collection("account").findOne({ userId: user._id, providerId: "credential" });

    if (!accountRecord?.password) {
      await logFailedAttempt(email, user._id, "NO_PASSWORD_RECORD", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword({ hash: accountRecord.password, password });

    if (!isValidPassword) {
      await logFailedAttempt(email, user._id, "INVALID_PASSWORD", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // STEP 5: Verify seed phrase
    const seedRecord = await Seedphrase.findOne({
      userId: user._id,
      isActive: true,
    }).select("+seedphrase");

    if (!seedRecord) {
      await logFailedAttempt(email, user._id, "NO_SEED_PHRASE", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    if (seedRecord.expiresAt && new Date() > seedRecord.expiresAt) {
      await logFailedAttempt(email, user._id, "SEED_PHRASE_EXPIRED", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    const isValidSeed = await bcrypt.compare(seedphrase.trim(), seedRecord.seedphrase);
    if (!isValidSeed) {
      const failedAttempts = (seedRecord.failedAttempts || 0) + 1;
      const lockout = failedAttempts >= 5;

      await Seedphrase.updateOne(
        { userId: user._id },
        { $set: { failedAttempts, ...(lockout && { isActive: false }) } }
      );

      await logFailedAttempt(
        email,
        user._id,
        "INVALID_SEED_PHRASE",
        ipAddress,
        userAgent,
        failedAttempts
      );
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // STEP 6: All factors verified — create session via auth.handler
    const betterAuthUrl = process.env.BETTER_AUTH_URL!;

    const signInResponse = await auth.handler(
      new Request(`${betterAuthUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          host: request.headers.get("host") || new URL(betterAuthUrl).host,
          origin: betterAuthUrl,
          "x-forwarded-for": ipAddress,
          ...(request.headers.get("cookie")
            ? { cookie: request.headers.get("cookie")! }
            : {}),
        },
        body: JSON.stringify({ email: email.toLowerCase(), password }),
      })
    );

    if (!signInResponse.ok) {
      const errorText = await signInResponse.text();
      console.error("Better Auth signIn failed:", signInResponse.status, errorText);
      await logFailedAttempt(email, user._id, "SESSION_CREATION_FAILED", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    const signInData = await signInResponse.json();
    const token = signInData?.token;

    if (!token) {
      await logFailedAttempt(email, user._id, "SESSION_CREATION_FAILED", ipAddress, userAgent);
      return NextResponse.json(
        { error: "Invalid email, password, or seed phrase" },
        { status: 401 }
      );
    }

    // STEP 7: Update audit records - DO NOT activate or onboard during login
    const newLoginCount = (admin.loginCount ?? 0) + 1;
    const loginTimestamp = new Date();
    
    // Prepare update operations - only update login tracking fields
    // IMPORTANT: Do NOT set isOnboarded or isActive here
    const adminUpdateFields: any = {
      $set: {
        lastLoginAt: loginTimestamp,
        lastLoginIP: ipAddress,
      },
      $inc: { loginCount: needsOnboarding ? 0 : 1 }, // Only increment login count if not onboarding (first login doesn't count)
    };
    
    const userUpdateFields: any = {
      $set: {
        displayName: admin.displayName,
        useSeedPhrase: admin.useSeedPhrase ?? true,
        loginCount: newLoginCount,
        lastLoginAt: loginTimestamp,
        lastLoginIP: ipAddress,
        // IMPORTANT: Do NOT set isOnboarded here - frontend will handle it
      },
    };

    await Promise.all([
      // Reset seed phrase failure counter
      Seedphrase.updateOne(
        { userId: user._id },
        { $set: { lastUsedAt: loginTimestamp, failedAttempts: 0 } }
      ),
      // Update admin audit fields (only login tracking, not onboarding status)
      Admin.updateOne(
        { userId: user._id },
        adminUpdateFields
      ),
      // Sync admin fields onto the Better Auth user document
      db.collection("user").updateOne(
        { _id: user._id },
        userUpdateFields
      ),
      logSuccessfulLogin(email, user._id, ipAddress, userAgent, needsOnboarding),
    ]);

    // Build response - indicate if onboarding is required
    const response = NextResponse.json({
      success: true,
      message: needsOnboarding ? "Login successful. Please complete your setup." : "Login successful",
      requiresOnboarding: needsOnboarding,
      user: {
        id: user._id.toString(),
        name: admin.name,
        displayName: admin.displayName,
        email: user.email,
        role: user.role,
        isOnboarded: admin.isOnboarded,
        isActive: admin.isActive,
        loginCount: newLoginCount,
        lastLoginAt: loginTimestamp,
      },
      token,
    });

    // Copy set-cookie headers
    signInResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        response.headers.append("set-cookie", value);
      }
    });

    return response;

  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}

async function logFailedAttempt(
  email: string,
  userId: any,
  reason: string,
  ipAddress: string,
  userAgent?: string,
  attemptsCount?: number
) {
  try {
    const db = mongoose.connection.db!;
    await db.collection("adminlogs").insertOne({
      email,
      action: 'login',
      userId: userId?.toString(),
      success: false,
      failureReason: reason,
      ipAddress,
      userAgent: userAgent || "unknown",
      timestamp: new Date(),
      failedAttemptsCount: attemptsCount,
    });
  } catch (error) {
    console.error("Failed to log attempt:", error);
  }
}

async function logSuccessfulLogin(
  email: string,
  userId: any,
  ipAddress: string,
  userAgent?: string,
  requiresOnboarding: boolean = false
) {
  try {
    const db = mongoose.connection.db!;
    await db.collection("adminlogs").insertOne({
      email,
      action: 'login',
      userId: userId.toString(),
      success: true,
      requiresOnboarding,
      ipAddress,
      userAgent: userAgent || "unknown",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to log successful login:", error);
  }
}