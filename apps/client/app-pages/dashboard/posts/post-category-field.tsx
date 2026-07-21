import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "./post-form-types";

interface CategoryFieldProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * CategoryField — post category picker. Identical markup on both
 * NewPostPage and EditPostPage.
 */
export function CategoryField({ value, onChange }: CategoryFieldProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <label className="mb-1.5 block text-sm font-semibold text-foreground">Category</label>
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full rounded-xl border-border bg-background text-sm">
          <SelectValue placeholder="Select a category" />
        </SelectTrigger>
        <SelectContent className="p-1">
          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
