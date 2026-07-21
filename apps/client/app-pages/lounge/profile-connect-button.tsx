"use client";

import { MessageCircle, UserPlus, Clock, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserRelationship, useConnectActions } from "@/hooks/use-user-relationship";
import { useActivityPanel } from "@/stores/activity-panel-store";
import { useOpenDM } from "@/hooks/use-open-dm";

/**
 * ProfileConnectButton — the connect/message action for a user's PROFILE page.
 *
 * Unlike the lounge (where you click an avatar to open a popover), a profile is
 * about one person, so this is a VISIBLE button that shows the right action
 * based on your relationship:
 *
 *   connected         → "Message"  (opens the DM, routes to /messages/[id])
 *   none              → "Connect"  (sends a connection request)
 *   request_sent      → "Request sent" (disabled)
 *   request_received  → "Respond" (hint to accept in the activity panel)
 *   self / blocked     → nothing rendered
 *
 * Place it in the profile header next to Follow/Edit. Pass the profile owner's
 * userId. It renders nothing for your own profile (status "self").
 *
 *   <ProfileConnectButton userId={profile.userId} />
 */
export function ProfileConnectButton({
  userId,
  className,
}: {
  userId: string;
  className?: string;
}) {
  const { relationship, isLoading } = useUserRelationship(userId);
  const { connect, isConnecting } = useConnectActions(userId);
  const { openDM, opening } = useOpenDM();
  const { open: openActivity } = useActivityPanel();
  const isMessaging = opening === userId;

  // While loading, render a neutral placeholder so layout doesn't jump.
  if (isLoading || !relationship) {
    return (
      <button disabled className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </button>
    );
  }

  // Nothing actionable for your own profile or a blocked relationship.
  if (relationship.status === "self" || relationship.status === "blocked") return null;

  const doConnect = async () => {
    try {
      await connect();
      toast.success("Connection request sent.");
    } catch (e: any) {
      toast.error(e?.response?.data?.error ?? "Couldn't send request.");
    }
  };

  const doMessage = () => openDM(userId); // routes to /messages/[id]; surfaces its own errors

  // Connected → Message
  if (relationship.status === "connected") {
    return (
      <button
        onClick={doMessage}
        disabled={isMessaging}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50", className)}
      >
        {isMessaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Message
      </button>
    );
  }

  // No relationship → Connect
  if (relationship.status === "none") {
    return (
      <button
        onClick={doConnect}
        disabled={isConnecting}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50", className)}
      >
        {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        Connect
      </button>
    );
  }

  // You already sent a request → waiting
  if (relationship.status === "request_sent") {
    return (
      <button disabled className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground", className)}>
        <Clock className="h-4 w-4" />
        Request sent
      </button>
    );
  }

  // They sent YOU a request → point them at the activity panel to accept
  if (relationship.status === "request_received") {
    return (
      <button
        onClick={() => openActivity("connections")}
        className={cn("inline-flex h-10 items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-5 text-sm font-medium text-primary hover:bg-primary/10", className)}
      >
        <Check className="h-4 w-4" />
        Respond
      </button>
    );
  }

  return null;
}