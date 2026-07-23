import mongoose, { Schema, Document } from "mongoose";

/**
 * ErrorLog Model
 * --------------
 * Captures errors from the frontend and backend for debugging.
 *
 * Sources:
 *   "frontend"        → JS exceptions, React error boundaries, network failures.
 *                       Sent via POST /api/errors (unauthenticated so pre-login
 *                       errors are captured too).
 *   "backend"         → Unhandled API route exceptions, DB errors,
 *                       third-party API failures.
 *   "background_job"  → Failed cron tasks, worker errors.
 *   "webhook"         → Payment provider or external service parse failures.
 *
 * Deduplication:
 *   Instead of a new document per occurrence, the service layer upserts on
 *   (errorCode + url + source) and increments occurrenceCount.
 *   One crashing component firing 500 times = one document, count of 500.
 *
 * TTL: 90 days by default. Critical errors get 1 year (set at app layer).
 */

export type ErrorSeverity = "critical" | "error" | "warning" | "info";
export type ErrorSource   = "frontend" | "backend" | "background_job" | "webhook";

export interface IErrorLog extends Document {
  _id: mongoose.Types.ObjectId;

  source:    ErrorSource;
  severity:  ErrorSeverity;

  /** Short code used for grouping — e.g. "DB_TIMEOUT", "UNHANDLED_REJECTION" */
  errorCode: string;

  message: string;

  /** Stack trace — backend errors; may be minified for frontend */
  stack?: string;

  /** Route or page URL where the error occurred */
  url?: string;

  /** HTTP method and status (backend) */
  httpMethod?: string;
  httpStatus?: number;

  /** Logged-in user at the time — null if unauthenticated */
  userId?:   mongoose.Types.ObjectId | null;
  userRole?: string;

  /** Browser context (frontend errors) */
  clientContext?: {
    userAgent?:  string;
    browser?:    string;
    os?:         string;
    screenSize?: string;
  };

  /** Server context (backend / job errors) */
  serverContext?: {
    nodeVersion?:   string;
    hostname?:      string;
    memoryUsageMb?: number;
    jobName?:       string;
  };

  /** Sanitised extra data — request body summary, query params, etc. */
  extra?: Record<string, unknown>;

  isResolved:      boolean;
  resolvedBy?:     mongoose.Types.ObjectId;
  resolvedAt?:     Date;
  resolutionNote?: string;

  /** Incremented on each duplicate instead of creating a new document */
  occurrenceCount: number;

  /** Updated each time a duplicate is upserted */
  lastOccurredAt: Date;

  /** TTL — MongoDB auto-deletes when this date is reached */
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ErrorLogSchema = new Schema<IErrorLog>(
  {
    source: {
      type: String,
      enum: ["frontend","backend","background_job","webhook"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["critical","error","warning","info"],
      required: true,
      index: true,
    },

    errorCode: { type: String, required: true, trim: true, maxlength: 100, index: true },
    message:   { type: String, required: true, trim: true, maxlength: 2000 },
    stack:     { type: String, maxlength: 10000 },

    url:        { type: String, maxlength: 500 },
    httpMethod: { type: String, maxlength: 10  },
    httpStatus: { type: Number },

    userId:   { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    userRole: { type: String, maxlength: 20 },

    clientContext: {
      userAgent:  { type: String, maxlength: 300 },
      browser:    { type: String, maxlength: 100 },
      os:         { type: String, maxlength: 100 },
      screenSize: { type: String, maxlength: 20  },
    },

    serverContext: {
      nodeVersion:   { type: String, maxlength: 20  },
      hostname:      { type: String, maxlength: 100 },
      memoryUsageMb: { type: Number },
      jobName:       { type: String, maxlength: 100 },
    },

    extra: { type: Schema.Types.Mixed },

    isResolved:      { type: Boolean, default: false, index: true },
    resolvedBy:      { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt:      { type: Date },
    resolutionNote:  { type: String, maxlength: 1000 },

    occurrenceCount: { type: Number, default: 1, min: 1 },
    lastOccurredAt:  { type: Date, default: () => new Date() },

    expiresAt: {
      type: Date,
      required: true,
      default: () => {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        return d;
      },
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true, collection: "error_logs" }
);

/** Dashboard: unresolved errors by severity, most recent first */
ErrorLogSchema.index({ isResolved: 1, severity: 1, lastOccurredAt: -1 });

/** Deduplication upsert key */
ErrorLogSchema.index({ errorCode: 1, url: 1, source: 1 });

export const ErrorLog =
  mongoose.models.ErrorLog ??
  mongoose.model<IErrorLog>("ErrorLog", ErrorLogSchema);