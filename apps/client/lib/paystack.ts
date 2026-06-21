// lib/server/paystack.ts

import crypto from 'crypto';

// SERVER-ONLY secret key. Must NOT carry the NEXT_PUBLIC_ prefix, or Next.js
// would inline it into the client bundle and expose it to every browser.
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error(
    'PAYSTACK_SECRET_KEY is not set. Add it to your .env.local (no NEXT_PUBLIC_ prefix).'
  );
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackHeaders {
  Authorization: string;
  'Content-Type': string;
}

function getHeaders(): PaystackHeaders {
  return {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function paystackFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers ?? {}),
    },
  });

  // Parse as text first so we can give a useful error on non-JSON responses
  // (e.g. Paystack gateway 502s, Cloudflare error pages, etc.)
  const text = await res.text();

  let json: any;
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

export interface InitializePaymentPayload {
  email: string;
  amount: number; // in kobo
  reference: string;
  currency?: string;
  /** Paystack plan code — when set, Paystack creates a recurring subscription */
  plan?: string;
  metadata?: Record<string, unknown>;
  callback_url?: string;
}

export interface PaystackInitializeResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackTransaction {
  id: number;
  status: string; // 'success' | 'failed' | 'abandoned'
  reference: string;
  amount: number;
  paid_at: string;
  channel: string;
  ip_address: string;
  gateway_response: string;
  currency: string;
  authorization: {
    authorization_code: string;
    card_type: string;
    last4: string;
    bank: string;
  };
  customer: {
    email: string;
  };
}

export interface PaystackRefundResponse {
  transaction: { reference: string };
  refund_reference: string;
  amount: number;
  refunded_at: string;
}

// ─── Methods ─────────────────────────────────────────────────────────────────

export const paystack = {
  /**
   * Initialize a Paystack transaction — returns access_code for inline modal.
   * Pass `plan` (a Paystack plan code) to have Paystack manage recurring billing.
   */
  initializeTransaction: (payload: InitializePaymentPayload) =>
    paystackFetch<PaystackInitializeResponse>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /**
   * Verify a transaction by reference.
   */
  verifyTransaction: (reference: string) =>
    paystackFetch<PaystackTransaction>(
      `/transaction/verify/${encodeURIComponent(reference)}`
    ),

  /**
   * Initiate a refund. Omit `amount` to refund the full transaction value.
   */
  refund: (reference: string, amount?: number) =>
    paystackFetch<PaystackRefundResponse>('/refund', {
      method: 'POST',
      body: JSON.stringify({
        transaction: reference,
        ...(amount !== undefined && { amount }),
      }),
    }),

  /**
   * Validate a Paystack webhook signature.
   *
   * Uses constant-time comparison (timingSafeEqual) to prevent timing attacks.
   * Returns false for any malformed or missing signature rather than throwing.
   */
  validateWebhookSignature: (rawBody: string, signature: string): boolean => {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY as string)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch {
      // timingSafeEqual throws if buffers differ in length (malformed signature)
      return false;
    }
  },
};