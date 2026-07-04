"use client";

import { Loader2, LogOut } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Message01Icon, UserAdd02Icon, Clock03Icon, Tick02Icon, UserMinus02Icon } from "@hugeicons/core-free-icons"
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserRelationship, useConnectActions } from "@/hooks/use-user-relationship";
import { useActivityPanel } from "@/stores/activity-panel-store";
import { useOpenDM } from "@/hooks/use-open-dm";

/**
 * ProfileConnectButton — the connect/message/disconnect action for a profile page.
 *
 * States handled:
 *   none             → "Follow" (creator target) or "Connect" (peer)
 *   request_sent     → "Requested" / "Request sent" + cancel option
 *   request_received → "Respond" (opens activity panel to accept/decline)
 *   connected        → "Message" (primary) + "Disconnect" (secondary)
 *   self / blocked   → renders nothing
 *
 * targetIsCreator controls Follow vs Connect label for the "none" state.
 */
export function ProfileConnectButton({
  targetUserId,
  targetIsCreator = false,
  className,
}: {
  targetUserId: string;
  targetIsCreator?: boolean;
  className?: string;
}) {
  const { relationship, isLoading } = useUserRelationship(targetUserId);
  const { connect, isConnecting, disconnect, isDisconnecting, } = useConnectActions(targetUserId);
  const { openDM, opening } = useOpenDM();
  const { open: openActivity } = useActivityPanel();
  const isMessaging = opening === targetUserId;

  if (isLoading || !relationship) {
    return (
      <button disabled className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  if (relationship.status === "self" || relationship.status === "blocked") return null;

  const doConnect = async () => {
    try {
      await connect();
      toast.success(targetIsCreator ? "Follow request sent." : "Connection request sent.");
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't send request.");
    }
  };

  const doDisconnect = async () => {
    try {
      const result = await disconnect();
      toast.success(
        result?.action === "cancelled"
          ? "Request cancelled."
          : targetIsCreator ? "Unfollowed." : "Disconnected."
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't disconnect.");
    }
  };

  const doMessage = () => openDM(targetUserId);

  // ── Connected → different UI for follow vs peer connection ─────────
  if (relationship.status === "connected") {
    if (targetIsCreator) {
      // Following a creator — show "Following" status + unfollow + message
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <button
            onClick={doMessage}
            disabled={isMessaging}
            title="Send message"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {isMessaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={Message01Icon} className="h-4 w-4" />}
          </button>
          <button
            onClick={doDisconnect}
            disabled={isDisconnecting}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
          >
            {isDisconnecting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4 text-primary" />}
            {isDisconnecting ? "Unfollowing…" : "Following"}
          </button>
        </div>
      );
    }

    // Peer connection — Message is primary, Disconnect is secondary icon
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          onClick={doMessage}
          disabled={isMessaging}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isMessaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={Message01Icon} className="h-4 w-4" />}
          Message
        </button>
        <button
          onClick={doDisconnect}
          disabled={isDisconnecting}
          title="Disconnect"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
        >
          {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={UserMinus02Icon} className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  // ── No relationship → Follow / Connect ───────────────────────────────
  if (relationship.status === "none") {
    return (
      <button
        onClick={doConnect}
        disabled={isConnecting}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50", className)}
      >
        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HugeiconsIcon icon={UserAdd02Icon} className="h-4 w-4" />}
        {targetIsCreator ? "Follow" : "Connect"}
      </button>
    );
  }

  // ── Request sent → pending label + cancel option ─────────────────────
  if (relationship.status === "request_sent") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button disabled className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground">
          <HugeiconsIcon icon={Clock03Icon} className="h-4 w-4" />
          {targetIsCreator ? "Requested" : "Request sent"}
        </button>
        <button
          onClick={doDisconnect}
          disabled={isDisconnecting}
          title="Cancel request"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
        >
          {isDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  // ── Request received → point to activity panel ────────────────────────
  if (relationship.status === "request_received") {
    return (
      <button
        onClick={() => openActivity("connections")}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-5 text-sm font-medium text-primary hover:bg-primary/10", className)}
      >
        <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />
        Respond
      </button>
    );
  }

  return null;
}