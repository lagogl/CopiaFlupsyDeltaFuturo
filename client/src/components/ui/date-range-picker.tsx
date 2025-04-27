import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { it } from "date-fns/locale";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (date: DateRange) => void;
  className?: string;
  locale?: Locale;
  align?: "center" | "start" | "end";
}

export function DateRangePicker({
  value,
  onChange,
  className,
  locale = it,
  align = "center",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "d MMM yyyy", { locale })} -{" "}
                  {format(value.to, "d MMM yyyy", { locale })}
                </>
              ) : (
                format(value.from, "d MMM yyyy", { locale })
              )
            ) : (
              <span>Seleziona un periodo</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align={align}
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(date) => {
              onChange(date || { from: new Date(), to: new Date() });
              // Close popover when both dates are selected
              if (date?.from && date?.to) {
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={locale}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}