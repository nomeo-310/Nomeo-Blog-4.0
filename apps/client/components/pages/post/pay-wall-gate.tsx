"use client"

import { useAuthModal } from "@/stores/modal-store";
import { Lock } from "lucide-react";
import Link from "next/link";



function PaywallGate({ needsMembership, isGuest, freeReadsRemaining }: { needsMembership: boolean; isGuest: boolean; freeReadsRemaining: number }) {
  const { open, setMode } = useAuthModal();
  return (
    <div className="mt-8">
      {/* Blurred preview */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="pointer-events-none select-none space-y-3 px-1 text-sm leading-relaxed text-foreground opacity-50 blur-sm">
          <p>This is where the rest of the story continues. The full post is available to members of the Nomeo platform.</p>
          <p>Join thousands of readers who follow the best writers on Nomeo and engage in the conversation that lives alongside every piece.</p>
          <p>Members get unlimited access to all paid posts, plus the ability to join members-only lounges run by their favourite creators.</p>
          <p>The platform brings together voices from across the globe, united by a shared love of the written word and the ideas behind it.</p>
        </div>
        {/* Gradient fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/70 to-background" />

        {/* Big lock — centred in the faded content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background/90 shadow-xl ring-4 ring-primary/20">
              <Lock className="h-9 w-9 text-primary" />
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Members only
            </span>
          </div>
        </div>
      </div>

      {/* Gate card */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {isGuest
            ? "Sign in to keep reading"
            : needsMembership
              ? "Get membership to continue"
              : "You've used your free reads"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {isGuest
            ? "Create a free account or sign in to read this post in full, like and save posts, and join the conversation."
            : needsMembership
              ? "This is a members-only post. Get a Nomeo membership for unlimited access to all paid posts and members-only lounges."
              : `You have ${freeReadsRemaining} free ${freeReadsRemaining === 1 ? "read" : "reads"} remaining this month. Upgrade for unlimited access.`}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isGuest ? (
            <>
              <button onClick={() => {setMode('sign-in'); open();}} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Sign in
              </button>
              <button onClick={() => {setMode('sign-up'); open();}}  className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
                Create account — free
              </button>
            </>
          ) : (
            <Link href="/membership" className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Get membership
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaywallGate