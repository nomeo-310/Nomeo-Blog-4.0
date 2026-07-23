"use client";

import { useState }        from "react";
import type { DateRange }  from "react-day-picker";
import { CalendarIcon }    from "lucide-react";
import { cn }              from "@/lib/utils";
import { Button }          from "@/components/ui/button";
import { Calendar }        from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateWindow, PresetRange } from "../types";

const PRESETS: { value: PresetRange; label: string }[] = [
  { value: "7d",  label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
];

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function DateRangePicker({
  value, onChange,
}: {
  value:    DateWindow;
  onChange: (window: DateWindow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(
    value.preset === "custom" ? { from: value.from, to: value.to } : undefined
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          size="sm"
          className={'rounded-md'}
          variant={value.preset === preset.value ? "default" : "outline"}
          onClick={() => onChange({ preset: preset.value })}
        >
          {preset.label}
        </Button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant={value.preset === "custom" ? "default" : "outline"}
              className={cn("gap-1.5 rounded-md")}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {value.preset === "custom" && value.from
                ? `${formatShortDate(value.from)} – ${formatShortDate(value.to ?? value.from)}`
                : "Custom"}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            numberOfMonths={2}
            selected={draft}
            defaultMonth={draft?.from}
            disabled={{ after: new Date() }}
            onSelect={(range) => {
              setDraft(range);
              if (range?.from && range?.to) {
                onChange({ preset: "custom", from: range.from, to: range.to });
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
