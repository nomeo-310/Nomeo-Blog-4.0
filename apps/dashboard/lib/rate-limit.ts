import { connectDB } from "./connect-to-database";
import { RateLimitHit } from "@/models/rate-limit-hit";

/**
 * Client IP for rate-limit bucketing. Trusts x-forwarded-for since the app
 * runs behind Vercel's proxy, which sets it on every request — a client
 * can't forge the value the edge actually saw.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit backed by MongoDB (see models/rate-limit-hit.ts).
 * Returns allowed: false once `limit` requests have landed in the current
 * `windowSeconds` window for this key.
 *
 * Usage: `rateLimit({ key: \`admin-login:${ip}\`, limit: 5, windowSeconds: 900 })`
 */
export async function rateLimit({
  key,
  limit,
  windowSeconds,
}: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await connectDB();

  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const bucketKey = `${key}:${bucket}`;
  const windowEnd = (bucket + 1) * windowMs;

  const hit = await RateLimitHit.findOneAndUpdate(
    { key: bucketKey },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(windowEnd + windowMs) },
    },
    { upsert: true, new: true }
  );

  const retryAfterSeconds = Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000));
  return { allowed: hit.count <= limit, retryAfterSeconds };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
