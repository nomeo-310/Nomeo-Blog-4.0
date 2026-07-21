"use client";


import { useRouter } from "next/navigation";
import { MessageCircle, Lock, Loader2 } from "lucide-react";
import { useAuthModal } from "@/stores/modal-store";
import { saveRedirectIntent } from "@/lib/redirect-storage";

/**
 * MessagesGate — guards the messages surfaces.
 *
 * Handles the three states a messages link can be hit in:
 *   1. Session still loading → neutral spinner (don't flash a gate at logged-in
 *      users during the brief useSession load).
 *   2. Logged OUT → a sign-in gate that opens the auth modal. Since auth is a
 *      modal (not a page), authenticating updates useSession and the guarded
 *      content renders in place — no redirect round-trip, they're "returned"
 *      automatically because the URL never changed.
 *   3. Access denied to a specific conversation (deep link to one that isn't
 *      yours / not connected / blocked) → a friendly "not available" gate.
 *
 * Usage — wrap the page content:
 *   <MessagesGate sessionLoading={isPending} authed={!!session?.user} accessDenied={denied}>
 *     ...the actual messages UI...
 *   </MessagesGate>
 */
export function MessagesGate({
  sessionLoading,
  authed,
  accessDenied = false,
  children,
}: {
  sessionLoading: boolean;
  authed: boolean;
  accessDenied?: boolean;
  children: React.ReactNode;
}) {
  const { open: openAuth, setMode } = useAuthModal();
  const router = useRouter();

  // Loading: show nothing jarring — a centered spinner.
  if (sessionLoading) {
    return (
      <GateShell>
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </GateShell>
    );
  }

  // Logged out → sign-in gate.
  if (!authed) {
    return (
      <GateShell>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-bold text-foreground">Sign in to view your messages</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Your conversations are private. Sign in to read and reply to your messages.
        </p>
        <button
          onClick={() => { saveRedirectIntent(); setMode("sign-in"); openAuth(); }}
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Sign in
        </button>
      </GateShell>
    );
  }

  // Authed but no access to this specific conversation.
  if (accessDenied) {
    return (
      <GateShell>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <MessageCircle className="h-6 w-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-heading text-lg font-bold text-foreground">This conversation isn&apos;t available</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          It may have been removed, or you might not have access. You can only message people you&apos;re connected with.
        </p>
        <button
          onClick={() => router.push("/messages")}
          className="mt-6 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          Back to messages
        </button>
      </GateShell>
    );
  }

  return <>{children}</>;
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-var(--nav-h,4rem))] flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

/**
 * EmptyConversations — shown in the inbox list when the user has no
 * conversations yet (authed, but nothing to show). Distinct from the
 * access/auth gates above.
 */
export function EmptyConversations() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
      <p className="mt-4 text-sm font-medium text-foreground">No conversations yet</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
        Connect with people and start a chat — your conversations will show up here.
      </p>
    </div>
  );
}