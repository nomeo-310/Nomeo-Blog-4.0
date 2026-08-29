import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { ErrorLog, type ErrorSource, type ErrorSeverity } from "@/models/error-log";

const RETENTION_DAYS: Record<ErrorSeverity, number> = {
  critical: 365,
  error: 90,
  warning: 90,
  info: 30,
};

export interface LogErrorInput {
  source: ErrorSource;
  severity?: ErrorSeverity;
  /** Grouping key — prefer error.digest for React/render errors; falls back to a slug of the message. */
  errorCode: string;
  message: string;
  stack?: string;
  url?: string;
  httpMethod?: string;
  httpStatus?: number;
  userId?: string | null;
  userRole?: string;
  clientContext?: { userAgent?: string; browser?: string; os?: string; screenSize?: string };
  serverContext?: { nodeVersion?: string; hostname?: string; memoryUsageMb?: number; jobName?: string };
  extra?: Record<string, unknown>;
}

/**
 * Upserts an ErrorLog entry, deduping repeated occurrences of the same
 * error (same errorCode + url + source) into one document with an
 * incrementing occurrenceCount rather than flooding the collection — see
 * models/error-log.ts. Never throws: a failure to log an error must not
 * itself become a second failure.
 */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    await connectDB();

    const severity = input.severity ?? "error";
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + RETENTION_DAYS[severity]);

    await ErrorLog.findOneAndUpdate(
      { errorCode: input.errorCode, url: input.url ?? null, source: input.source },
      {
        $set: {
          severity,
          message: input.message.slice(0, 2000),
          stack: input.stack?.slice(0, 10000),
          httpMethod: input.httpMethod,
          httpStatus: input.httpStatus,
          userId: input.userId ? new mongoose.Types.ObjectId(input.userId) : null,
          userRole: input.userRole,
          clientContext: input.clientContext,
          serverContext: input.serverContext,
          extra: input.extra,
          lastOccurredAt: now,
          expiresAt,
        },
        $inc: { occurrenceCount: 1 },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[logError] failed to write ErrorLog:", err);
  }
}
