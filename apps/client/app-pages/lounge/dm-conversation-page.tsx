"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { authClient } from "@/lib/authClient";
import { ConversationPane } from "./conversation-pane";

/**
 * DmConversationPage — deep-link view for a single conversation (/messages/[id]).
 *
 * The primary DM experience is the unified two-pane /messages page. This route
 * exists for direct links (e.g. after clicking "Message" on a profile, which
 * routes here). It renders the same ConversationPane, full-width, with a back
 * button to the inbox.
 */
export default function DmConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  if (!session?.user) return null;

  return (
    <div className="mx-auto flex h-[calc(100vh-var(--nav-h,4rem))] max-w-3xl flex-col overflow-hidden border-x border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button onClick={() => router.push("/messages")} aria-label="Back to messages"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-accent">
          <ArrowLeft className="h-4 w-4" /> All messages
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <ConversationPane
          conversationId={id}
          currentUserId={session.user.id}
          currentUserName={session.user.name ?? "You"}
        />
      </div>
    </div>
  );
}