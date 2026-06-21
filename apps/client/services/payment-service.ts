import mongoose from "mongoose";
import { nanoid } from "nanoid";
import {
  Payment,
  PaymentGatewayStatus,
  PaymentProvider,
  PaymentPurpose,
  type IPaymentDocument,
} from "@/models/payment";
import { paystack, type PaystackTransaction } from "@/lib/paystack";

/**
 * PaymentService — Nomeo
 * ----------------------
 * Subscription payments only. Initiates a Paystack transaction, verifies it
 * (polling safety-net), and processes the webhook (source of truth).
 *
 * Flow: initiate (pending Payment + Paystack init) → user pays on Paystack →
 * webhook/verify flips status → POST /api/subscriptions activates the sub.
 */

export interface InitiateSubscriptionInput {
  email: string;
  userId: string;
  planId: string;
  amount: number; // kobo
  currency?: string;
  /** Paystack plan code for recurring billing (plan.externalPriceId) */
  paystackPlanCode?: string;
  metadata?: Record<string, unknown>;
}

export const PaymentService = {
  /**
   * Create a pending Payment and initialize the Paystack transaction.
   * Paystack is called first so we fail fast before writing to the DB.
   */
  async initiate(input: InitiateSubscriptionInput) {
    const reference = `nomeo_${nanoid(16)}`;
    const currency = input.currency ?? "NGN";

    const paystackData = await paystack.initializeTransaction({
      email: input.email,
      amount: input.amount,
      reference,
      currency,
      ...(input.paystackPlanCode ? { plan: input.paystackPlanCode } : {}),
      metadata: {
        purpose: PaymentPurpose.SUBSCRIPTION,
        userId: input.userId,
        planId: input.planId,
        ...(input.metadata ?? {}),
      },
    });

    const payment = await Payment.create({
      purpose: PaymentPurpose.SUBSCRIPTION,
      provider: PaymentProvider.PAYSTACK,
      userId: new mongoose.Types.ObjectId(input.userId),
      planId: new mongoose.Types.ObjectId(input.planId),
      amount: input.amount,
      amountPaid: input.amount,
      currency,
      reference,
      accessCode: paystackData.access_code,
      authorizationUrl: paystackData.authorization_url,
      gatewayStatus: PaymentGatewayStatus.PENDING,
    });

    return {
      payment,
      reference,
      accessCode: paystackData.access_code,
      authorizationUrl: paystackData.authorization_url,
    };
  },

  /** Verify against Paystack and update the local record. */
  async verify(reference: string): Promise<IPaymentDocument> {
    const payment = await Payment.findOne({ reference });
    if (!payment) throw new Error("Payment record not found");

    // Terminal already — skip the network call.
    if (
      payment.gatewayStatus === PaymentGatewayStatus.SUCCESS ||
      payment.gatewayStatus === PaymentGatewayStatus.FAILED ||
      payment.gatewayStatus === PaymentGatewayStatus.REVERSED
    ) {
      return payment;
    }

    const tx = await paystack.verifyTransaction(reference);

    payment.gatewayStatus = mapPaystackStatus(tx.status);
    payment.paystackReference = tx.reference;
    payment.gatewayResponse = tx.gateway_response;
    payment.channel = tx.channel;
    payment.ipAddress = tx.ip_address;
    payment.paidAt = tx.paid_at ? new Date(tx.paid_at) : undefined;
    payment.cardType = tx.authorization?.card_type;
    payment.cardLast4 = tx.authorization?.last4;
    payment.cardBank = tx.authorization?.bank;
    payment.authorizationCode = tx.authorization?.authorization_code;

    await payment.save();
    return payment;
  },

  /** Process a verified webhook event. Signature is validated first. */
  async handleWebhook(rawBody: string, signature: string) {
    if (!paystack.validateWebhookSignature(rawBody, signature)) {
      throw new Error("Invalid webhook signature");
    }

    const event = JSON.parse(rawBody) as { event: string; data: PaystackTransaction };

    if (event.event === "charge.success") {
      const payment = await PaymentService.verify(event.data.reference);
      return { handled: true, payment };
    }

    return { handled: false, event: event.event };
  },

  /** Per-user payment stats for a billing/account page. */
  async getStats(userId: string) {
    const stats = await Payment.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), purpose: PaymentPurpose.SUBSCRIPTION } },
      {
        $group: {
          _id: null,
          totalPaid: {
            $sum: { $cond: [{ $eq: ["$gatewayStatus", PaymentGatewayStatus.SUCCESS] }, "$amountPaid", 0] },
          },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ["$gatewayStatus", PaymentGatewayStatus.SUCCESS] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ["$gatewayStatus", PaymentGatewayStatus.FAILED] }, 1, 0] },
          },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);

    return (
      stats[0] ?? {
        totalPaid: 0,
        successfulPayments: 0,
        failedPayments: 0,
        totalTransactions: 0,
      }
    );
  },
};

function mapPaystackStatus(status: string): PaymentGatewayStatus {
  const map: Record<string, PaymentGatewayStatus> = {
    success: PaymentGatewayStatus.SUCCESS,
    failed: PaymentGatewayStatus.FAILED,
    abandoned: PaymentGatewayStatus.ABANDONED,
    reversed: PaymentGatewayStatus.REVERSED,
  };
  return map[status] ?? PaymentGatewayStatus.PENDING;
}