"use client";

import Link              from "next/link";
import { HugeiconsIcon }  from "@hugeicons/react";
import { BugIcon }        from "@hugeicons/core-free-icons";

export function SystemAlert({ unresolvedErrors }: { unresolvedErrors: number }) {
  if (unresolvedErrors <= 0) return null;

  return (
    <Link
      href="/dashboard/errors"
      className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
    >
      <HugeiconsIcon icon={BugIcon} className="h-4 w-4 shrink-0" />
      {unresolvedErrors} unresolved error{unresolvedErrors === 1 ? "" : "s"} need attention.
    </Link>
  );
}
