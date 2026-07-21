/** Loading placeholder for the payments table. */
export function PaymentsSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
          <div className="h-3.5 w-16 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-5 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
