// lib/paystack.ts — outbound transfers only (creator payouts).
//
// Bank listing, account resolution and Transfer Recipient creation happen on
// the client app when a creator sets up their payout details — this app only
// ever needs to move money to an already-registered recipient once an admin
// honors a requested payout.

// SERVER-ONLY secret key. Must NOT carry the NEXT_PUBLIC_ prefix, or Next.js
// would inline it into the client bundle and expose it to every browser.
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error(
    'PAYSTACK_SECRET_KEY is not set. Add it to your .env.local (no NEXT_PUBLIC_ prefix).'
  );
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();

  let json: { status: boolean; message?: string; data: T };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Paystack returned non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`
    );
  }

  if (!res.ok || !json.status) {
    throw new Error(
      json.message ?? `Paystack request failed with status ${res.status}`
    );
  }

  return json.data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InitiateTransferPayload {
  amount: number; // kobo
  recipient: string; // recipient_code
  reason?: string;
  reference: string; // our own idempotency key
  currency?: string;
}

export interface PaystackTransferResponse {
  transfer_code: string;
  reference: string;
  status: string; // 'success' | 'pending' | 'otp' | 'failed'
  amount: number;
}

// ─── Methods ─────────────────────────────────────────────────────────────────

export const paystack = {
  /**
   * Initiate a transfer from the platform's Paystack balance to a
   * registered recipient. `reference` is the idempotency key — reusing one
   * that already succeeded returns the same transfer rather than double-paying.
   */
  initiateTransfer: (payload: InitiateTransferPayload) =>
    paystackFetch<PaystackTransferResponse>('/transfer', {
      method: 'POST',
      body: JSON.stringify({ source: 'balance', currency: 'NGN', ...payload }),
    }),
};
