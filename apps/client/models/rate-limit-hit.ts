import mongoose, { Schema, Document } from "mongoose";

/**
 * Fixed-window request counter backing lib/rate-limit.ts. Each document is
 * one (bucket key) for one time window; a TTL index reaps it once the
 * window has fully elapsed so the collection never grows unbounded.
 *
 * MongoDB rather than in-memory because this runs on serverless functions —
 * an in-memory Map would reset on every cold start and not be shared across
 * concurrent instances, making it trivial to bypass.
 */
export interface IRateLimitHit extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

const RateLimitHitSchema = new Schema<IRateLimitHit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

export const RateLimitHit =
  mongoose.models.RateLimitHit ?? mongoose.model<IRateLimitHit>("RateLimitHit", RateLimitHitSchema);
