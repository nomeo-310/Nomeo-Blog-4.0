import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/connect-to-database";
import { getCurrentUser } from "@/lib/session";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { Profile, type IPayoutDetails } from "@/models/profile";
import { paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function maskAccountNumber(accountNumber: string): string {
  return `•••• ${accountNumber.slice(-4)}`;
}

function serialize(details: IPayoutDetails) {
  return {
    bankCode: details.bankCode,
    bankName: details.bankName,
    accountNumber: maskAccountNumber(details.accountNumber),
    accountName: details.accountName,
    verified: Boolean(details.recipientCode),
    verifiedAt: details.verifiedAt ?? null,
  };
}

/**
 * GET /api/creator/payout-details
 * ---------------------------------
 * The signed-in creator's own payout bank account, masked. null when they
 * haven't set one up yet.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.isCreator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const profile = await Profile.findOne(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { payoutDetails: 1 }
    ).lean();

    return NextResponse.json({
      payoutDetails: profile?.payoutDetails ? serialize(profile.payoutDetails) : null,
    });
  } catch (err) {
    console.error("[GET /api/creator/payout-details]", err);
    return NextResponse.json({ error: "Failed to load payout details" }, { status: 500 });
  }
}

/**
 * POST /api/creator/payout-details
 * -----------------------------------
 * Sets/replaces the creator's payout bank account. The account name is
 * NEVER taken from the request — it's resolved from Paystack's
 * account-resolution API against (accountNumber, bankCode), so a payout can
 * never silently go to a mistyped account. Once resolved, the account is
 * registered as a Paystack Transfer Recipient — recipientCode being set is
 * what makes "Request payout" possible from the earnings dashboard, and
 * what lets an admin honor that request.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isCreator) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bankCode?: string; accountNumber?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bankCode = body.bankCode?.trim();
  const accountNumber = body.accountNumber?.trim();

  if (!bankCode || !accountNumber || !/^\d{10}$/.test(accountNumber)) {
    return NextResponse.json({ error: "A valid bank and 10-digit account number are required" }, { status: 400 });
  }

  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await rateLimit({ key: "payout-details:" + ip, limit: 5, windowSeconds: 900 });
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    await connectDB();

    const banks = await paystack.listBanks();
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) {
      return NextResponse.json({ error: "Unrecognized bank" }, { status: 400 });
    }

    let resolved;
    try {
      resolved = await paystack.resolveAccountNumber(accountNumber, bankCode);
    } catch {
      return NextResponse.json({ error: "Couldn't verify that account number — double-check it and the bank." }, { status: 400 });
    }

    let recipient;
    try {
      recipient = await paystack.createTransferRecipient({
        type: "nuban",
        name: resolved.account_name,
        account_number: accountNumber,
        bank_code: bankCode,
      });
    } catch {
      return NextResponse.json({ error: "Couldn't register this account for payouts. Try again." }, { status: 502 });
    }

    const payoutDetails: IPayoutDetails = {
      bankCode,
      bankName: bank.name,
      accountNumber,
      accountName: resolved.account_name,
      recipientCode: recipient.recipient_code,
      verifiedAt: new Date(),
    };

    const profile = await Profile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(user.id) },
      { $set: { payoutDetails } },
      { new: true }
    );

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    return NextResponse.json({ payoutDetails: serialize(profile.payoutDetails!) });
  } catch (err) {
    console.error("[POST /api/creator/payout-details]", err);
    return NextResponse.json({ error: "Failed to save payout details" }, { status: 500 });
  }
}
