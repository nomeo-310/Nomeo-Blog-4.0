import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Series } from "./post-form-types";

interface SeriesFieldProps {
  series: Series[];
  selectValue: string;
  onSelectValueChange: (value: string | null) => void;
  seriesId: string;
  seriesOrder: number | "";
  onSeriesOrderChange: (value: number | "") => void;
  onNewSeriesClick: () => void;
  icon: React.ReactNode;
}

/**
 * SeriesField — series picker + optional part-number input. Shared by
 * NewPostPage and EditPostPage.
 *
 * `selectValue`/`onSelectValueChange` are passed through as-is because the
 * two pages compute the Select's controlled value slightly differently
 * (NewPostPage uses the raw seriesId, EditPostPage defaults to "_none").
 */
export function SeriesField({
  series, selectValue, onSelectValueChange, seriesId, seriesOrder, onSeriesOrderChange, onNewSeriesClick, icon,
}: SeriesFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-sm font-semibold text-foreground">
          {icon}
          Series
        </label>
        <button onClick={onNewSeriesClick}
          className="text-xs font-semibold text-primary hover:underline">
          + New series
        </button>
      </div>
      <Select value={selectValue} onValueChange={onSelectValueChange}>
        <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
          <SelectValue placeholder="None (standalone post)" />
        </SelectTrigger>
        <SelectContent className="p-1">
          <SelectItem value="_none">None (standalone post)</SelectItem>
          {series.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.title}
              {s.postsCount > 0 && <span className="ml-1 text-muted-foreground">· {s.postsCount} posts</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {seriesId && (
        <div className="mt-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Part number in series</label>
          <input
            type="number" min={1} value={seriesOrder}
            onChange={(e) => onSeriesOrderChange(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="e.g. 1"
            className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <p className="mt-1 text-xs text-muted-foreground">Leave blank to append at the end.</p>
        </div>
      )}
    </div>
  );
}
