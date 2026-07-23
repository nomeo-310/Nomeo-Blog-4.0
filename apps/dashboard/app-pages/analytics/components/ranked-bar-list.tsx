"use client";

export interface RankedBarItem {
  key:            string;
  label:          string;
  value:          number;
  formattedValue?: string;
}

export function RankedBarList({
  items, emptyLabel = "No data yet.",
}: {
  items: RankedBarItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {item.formattedValue ?? item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
