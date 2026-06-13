import { Profile } from "@/models/profile";

/**
 * Username generation — bulletproof against race conditions.
 *
 * Better Auth supplies no username (neither email/password nor Google OAuth),
 * but Profile.username is required and unique. A naive "check then insert"
 * has a race: two concurrent signups can pass the existence check with the
 * same candidate, then one insert fails on the unique index.
 *
 * The safe pattern is to let the database be the source of truth:
 *   - buildBaseUsername()      → deterministic sanitised base from name/email
 *   - withUsernameSuffix()     → base + short random suffix
 *   - isDuplicateKeyError()    → detects Mongo error 11000
 *
 * The actual insert-with-retry lives in the auth create hook, which attempts
 * Profile.create() and, on a duplicate-key error for `username`, regenerates
 * the suffix and retries. This way the unique index — not a pre-check — is
 * what guarantees uniqueness, which is the only race-free approach.
 */

/** Sanitise a name or email into a valid base handle (no uniqueness check). */
export function buildBaseUsername(seed: string): string {
  const raw = seed.includes("@") ? seed.split("@")[0] : seed;

  let base = raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Schema requires 3–32 chars; leave room for a "_xxxx" suffix
  if (base.length < 3) base = `user_${base}`;
  return base.slice(0, 24);
}

/** Append a short random suffix, e.g. "afolabi" → "afolabi_7k2q". */
export function withUsernameSuffix(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 6); // 4 chars
  return `${base.slice(0, 27)}_${suffix}`;
}

/**
 * True if the error is a MongoDB duplicate-key error (code 11000),
 * optionally for a specific field. Works across mongoose/mongodb error shapes.
 */
export function isDuplicateKeyError(err: unknown, field?: string): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown>; message?: string };
  if (e?.code !== 11000) return false;
  if (!field) return true;
  if (e.keyPattern && field in e.keyPattern) return true;
  // Fallback for drivers that only surface the message
  return typeof e.message === "string" && e.message.includes(field);
}

/**
 * Optional convenience: a best-effort unique username WITHOUT relying on the
 * insert. Useful for previews/suggestions in the UI, but NOT a substitute for
 * the insert-retry in the create hook — only the unique index is race-proof.
 */
export async function suggestUniqueUsername(seed: string): Promise<string> {
  const base = buildBaseUsername(seed);
  for (let i = 0; i < 5; i++) {
    const candidate = i === 0 ? base : withUsernameSuffix(base);
    const exists = await Profile.exists({ username: candidate });
    if (!exists) return candidate;
  }
  return withUsernameSuffix(base);
}