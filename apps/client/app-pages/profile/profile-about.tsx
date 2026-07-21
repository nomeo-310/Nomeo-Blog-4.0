/** Free-text "About" card — shown when set, for both creators and readers. */
export function ProfileAbout({ about }: { about: string }) {
  if (!about) return null;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-3 font-heading text-base font-bold text-foreground">About</h2>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {about}
      </p>
    </div>
  );
}
