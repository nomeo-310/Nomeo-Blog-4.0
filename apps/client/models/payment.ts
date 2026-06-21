import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Payment Model — Nomeo
 * ---------------------
 * Records inbound payments for platform membership subscriptions, processed
 * through Paystack. Amounts are in kobo (NGN smallest unit).
 *
 * Nomeo's only payment purpose right now is "subscription" — a reader paying
 * for membership. (Creator payouts are a separate outbound flow, not modelled
 * here.) No coupons, no event-registration context — those were event-platform
 * concepts and don't apply.
 *
 * The webhook is the source of truth for status; the verify endpoint is a
 * polling safety-net. Both funnel through PaymentService and update this record.
 */

export enum PaymentProvider {
  PAYSTACK = "paystack",
}

export enum PaymentPurpose {
  SUBSCRIPTION = "subscription",
}

export enum PaymentGatewayStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  ABANDONED = "abandoned",
  REVERSED = "reversed",
}

export interface IPayment {
  purpose: PaymentPurpose;
  provider: PaymentProvider;

  /** Who paid */
  userId: mongoose.Types.ObjectId;
  /** Subscription context — planId set at initiation; subscriptionId after activation */
  planId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;

  /** Amount in kobo */
  amount: number;
  amountPaid: number;
  currency: string;

  /** Paystack handshake */
  reference: string; // our generated reference
  paystackReference?: string; // Paystack's own reference (from verify/webhook)
  accessCode?: string;
  authorizationUrl?: string;

  /** Gateway result */
  gatewayStatus: PaymentGatewayStatus;
  gatewayResponse?: string;
  channel?: string;
  ipAddress?: string;
  paidAt?: Date;

  /** Non-sensitive card details from Paystack */
  cardType?: string;
  cardLast4?: string;
  cardBank?: string;
  /** Reusable token for recurring charges */
  authorizationCode?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentDocument extends IPayment, Document {
  isSuccessful(): boolean;
}

type IPaymentModel = Model<IPaymentDocument>;

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    purpose: {
      type: String,
      enum: Object.values(PaymentPurpose),
      default: PaymentPurpose.SUBSCRIPTION,
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      default: PaymentProvider.PAYSTACK,
      required: true,
    },

    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", index: true },

    amount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    currency: { type: String, uppercase: true, default: "NGN" },

    reference: { type: String, required: true, unique: true },
    paystackReference: { type: String },
    accessCode: { type: String },
    authorizationUrl: { type: String },

    gatewayStatus: {
      type: String,
      enum: Object.values(PaymentGatewayStatus),
      default: PaymentGatewayStatus.PENDING,
      index: true,
    },
    gatewayResponse: { type: String },
    channel: { type: String },
    ipAddress: { type: String },
    paidAt: { type: Date },

    cardType: { type: String },
    cardLast4: { type: String },
    cardBank: { type: String },
    authorizationCode: { type: String },
  },
  { timestamps: true, collection: "payments" }
);

PaymentSchema.index({ purpose: 1, gatewayStatus: 1 });
PaymentSchema.index({ userId: 1, createdAt: -1 });

PaymentSchema.methods.isSuccessful = function (): boolean {
  return this.gatewayStatus === PaymentGatewayStatus.SUCCESS;
};

export const Payment =
  (mongoose.models.Payment as IPaymentModel) ||
  mongoose.model<IPaymentDocument, IPaymentModel>("Payment", PaymentSchema);