// lib/sms-service.ts
/**
 * SMS Service
 * -----------
 * Thin wrapper around Termii's HTTP API (https://developers.termii.com) —
 * a common choice for NGN-priced platforms, matching the rest of this app's
 * payment currency. Swap the fetch call below for a different provider by
 * changing this file only; callers never touch the provider directly.
 *
 * No SMS provider is configured out of the box. Until SMS_API_KEY is set in
 * .env, every send fails fast with a clear, per-recipient error recorded in
 * SmsLog — campaigns can still be created and "sent" (attempted), but nothing
 * actually goes out until real credentials are added.
 *
 * Required env vars once you have a Termii account:
 *   SMS_API_KEY     — Termii API key
 *   SMS_SENDER_ID   — registered sender ID (max 11 chars, e.g. "QuilHub")
 */

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Termii requires international format with no leading "+" (e.g. 2348012345678).
 * Most numbers will be entered in local Nigerian format (08012345678) or with
 * a "+" prefix — normalize both so callers don't need to think about it.
 * Numbers already in another country's format (not starting with 0) are left
 * as-is (minus any "+"/spaces/dashes) rather than guessed at.
 */
export function normalizePhoneNumber(raw: string): string {
  const digitsOnly = raw.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return `234${digitsOnly.slice(1)}`;
  }
  return digitsOnly;
}

export async function sendSms(to: string, message: string): Promise<SendSmsResult> {
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || "QuilHub";

  if (!apiKey) {
    return { success: false, error: "SMS provider not configured — set SMS_API_KEY in .env" };
  }

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalizePhoneNumber(to),
        from: senderId,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { success: false, error: data?.message ?? `SMS send failed (${response.status})` };
    }

    return { success: true, messageId: data?.message_id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown SMS error" };
  }
}

export interface SmsBalanceResult {
  success: boolean;
  balance?: string;
  currency?: string;
  error?: string;
}

/** Hits Termii's balance endpoint — the simplest way to confirm SMS_API_KEY is valid and live. */
export async function checkSmsBalance(): Promise<SmsBalanceResult> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    return { success: false, error: "SMS provider not configured — set SMS_API_KEY in .env" };
  }

  try {
    const response = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(apiKey)}`);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { success: false, error: data?.message ?? `Balance check failed (${response.status})` };
    }

    return { success: true, balance: data?.balance, currency: data?.currency };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown SMS error" };
  }
}

export const smsService = { send: sendSms, checkBalance: checkSmsBalance };
