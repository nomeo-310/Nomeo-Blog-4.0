import { HugeiconsIcon } from "@hugeicons/react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Notification } from "./notifications-types";

/** A single notification row in the full archive list. */
export function NotificationItem({ notification, onMarkRead }: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-5 py-4 transition-colors",
        !notification.isRead && "bg-primary/[0.03]"
      )}
    >
      {/* Unread dot */}
      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", !notification.isRead ? "bg-primary" : "bg-transparent")} />

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug", notification.isRead ? "text-muted-foreground" : "font-medium text-foreground")}>
          {notification.message}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px]">{notification.type.replace(/_/g, " ")}</span>
        </div>
      </div>

      {!notification.isRead && (
        <button
          onClick={onMarkRead}
          title="Mark as read"
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon icon={Tick02Icon} className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
