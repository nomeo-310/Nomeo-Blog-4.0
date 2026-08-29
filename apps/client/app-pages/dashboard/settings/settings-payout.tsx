"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon, BankIcon } from "@hugeicons/core-free-icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Field, inputCls } from "./settings-field";
import { usePayoutBanks, usePayoutDetails, useSavePayoutDetails } from "@/hooks/use-payout-details";

/**
 * PayoutSettings — creator-only tab for setting up where their monthly
 * CreatorEarning payouts get sent. Only rendered inside the Payout tab;
 * gated on role by the caller (a non-creator sees an explainer instead).
 *
 * The bank list comes live from Paystack (never hardcoded) and the account
 * name is always resolved server-side against Paystack, never typed here —
 * this component only collects the bank + account number.
 */
export function PayoutSettings() {
  const { data: banks, isLoading: banksLoading } = usePayoutBanks();
  const { data: current, isLoading: currentLoading } = usePayoutDetails();
  const save = useSavePayoutDetails();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const accountNumberValid = /^\d{10}$/.test(accountNumber);
  const canSubmit = !!bankCode && accountNumberValid && !save.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    save.mutate({ bankCode, accountNumber }, {
      onSuccess: () => {
        setBankCode("");
        setAccountNumber("");
      },
    });
  };

  if (currentLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-4 w-48 rounded bg-muted" />
        <div className="mt-2 h-3 w-72 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {current && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/5 p-5">
          <HugeiconsIcon icon={Tick02Icon} className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="font-heading text-base font-bold text-foreground">Payout account on file</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.bankName} · {current.accountNumber} · {current.accountName}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is where your monthly earnings are sent once you request a payout. Saving a new account below replaces it.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HugeiconsIcon icon={BankIcon} className="h-4 w-4 text-primary" />
            {current ? "Update payout account" : "Add a payout account"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A Nigerian bank account. We verify the account name with your bank before saving it — it can never silently go to the wrong person.
          </p>
        </div>

        <Field label="Bank">
          <Select value={bankCode} onValueChange={(v) => setBankCode(v ?? "")}>
            <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
              <SelectValue placeholder={banksLoading ? "Loading banks…" : "Select your bank"} />
            </SelectTrigger>
            <SelectContent className="p-1 max-h-72">
              {banks?.map((b) => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Account number" hint="10 digits, no dashes or spaces.">
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="0123456789"
            inputMode="numeric"
            className={inputCls}
          />
        </Field>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            )}
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />}
            {save.isPending ? "Verifying…" : "Verify & save"}
          </button>
        </div>
      </div>
    </div>
  );
}
