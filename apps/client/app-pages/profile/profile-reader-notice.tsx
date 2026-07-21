/** Privacy placeholder shown on a reader's (non-creator) public profile. */
export function ProfileReaderNotice({ displayName }: { displayName: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
      <UserIcon className="mx-auto h-9 w-9 text-muted-foreground/30" />
      <p className="mt-3 text-sm font-medium text-foreground">{displayName} is a reader</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Reading activity is private. Connect to see more.
      </p>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
