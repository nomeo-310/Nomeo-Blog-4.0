"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useRequestPayout } from "@/hooks/use-payout-details";

interface RequestPayoutButtonProps {
  earningId: string;
}

/** Fires the payout request, then refreshes the (server-rendered) earnings page. */
export function RequestPayoutButton({ earningId }: RequestPayoutButtonProps) {
  const router = useRouter();
  const request = useRequestPayout(earningId);

  return (
    <button
      type="button"
      disabled={request.isPending}
      onClick={() => request.mutate(undefined, { onSuccess: () => router.refresh() })}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {request.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      {request.isPending ? "Requesting…" : "Request payout"}
    </button>
  );
}
