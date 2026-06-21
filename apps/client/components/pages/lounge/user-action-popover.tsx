"use client";

import { MessageCircle, UserPlus, Clock, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useUserRelationship, useConnectActions } from "@/hooks/use-user-relationship";
import { useOpenDM } from "@/hooks/use-open-dm";

/**
 * UserActionPopover — shown when you click a user (e.g. in the lounge presence
 * sidebar). Decides the action from the relationship:
 *   connected        → Message
 *   none             → Connect
 *   request_sent     → "Request sent" (disabled)
 *   request_received → "Responds in your requests" (info)
 *   blocked / self   → nothing actionable
 */
export function UserActionPopover({
  userId, userName, onClose,
}: {
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const { relationship, isLoading } = useUserRelationship(userId);
  const { connect, isConnecting } = useConnectActions(userId);
  const { openDM, opening } = useOpenDM();
  const isMessaging = opening === userId;

  const doConnect = async () => {
    try {
      await connect();
      toast.success(`Connection request sent to ${userName}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't send request.");
    }
  };

  const doMessage = async () => {
    await openDM(userId); // routes to /messages/[id]; surfaces its own errors
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="font-heading text-sm font-bold text-card-foreground">{userName}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading || !relationship ? (
          <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : relationship.status === "connected" ? (
          <button onClick={doMessage} disabled={isMessaging}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {isMessaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Message
          </button>
        ) : relationship.status === "none" ? (
          <button onClick={doConnect} disabled={isConnecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Connect
          </button>
        ) : relationship.status === "request_sent" ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" /> Request sent
          </div>
        ) : relationship.status === "request_received" ? (
          <div className="rounded-lg bg-primary/5 p-3 text-center text-xs text-foreground">
            <Check className="mx-auto mb-1 h-4 w-4 text-primary" />
            {userName} sent you a request — accept it in your connections.
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">No actions available.</p>
        )}
      </div>
    </div>
  );
}