"use client";

import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const DATE_FORMAT = "yyyy-MM-dd";

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  return parse(value, DATE_FORMAT, new Date());
}

function toValue(date: Date): string {
  return format(date, DATE_FORMAT);
}

/** Shared date-range filter — same Calendar/Popover pattern as the analytics date-range picker, generalized for admin filter bars using separate dateFrom/dateTo string state. */
export function DateRangeFilter({
  dateFrom, dateTo, onChange, placeholder = "Date range",
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (dateFrom: string, dateTo: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const fromDate = toDate(dateFrom);
  const toDateValue = toDate(dateTo);
  const selected: DateRange | undefined = fromDate || toDateValue ? { from: fromDate, to: toDateValue } : undefined;

  const label = fromDate
    ? `${format(fromDate, "MMM d")}${toDateValue ? ` – ${format(toDateValue, "MMM d")}` : ""}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("justify-start gap-1.5 rounded-lg border-input text-sm font-normal", !fromDate && "text-muted-foreground")}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {label}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selected}
          defaultMonth={fromDate}
          disabled={{ after: new Date() }}
          onSelect={(range) => {
            onChange(range?.from ? toValue(range.from) : "", range?.to ? toValue(range.to) : "");
            if (range?.from && range?.to) setOpen(false);
          }}
        />
        {(dateFrom || dateTo) && (
          <div className="flex justify-end border-t border-border p-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-md text-xs" onClick={() => { onChange("", ""); setOpen(false); }}>
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
