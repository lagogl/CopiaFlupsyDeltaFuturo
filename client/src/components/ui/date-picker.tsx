import * as React from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: Date | undefined;
  setDate?: ((date: Date | undefined) => void) | React.Dispatch<React.SetStateAction<Date | undefined>> | React.Dispatch<React.SetStateAction<Date>>;
  mode?: "single" | "range" | "multiple" | undefined;
  onSelect?: ((date: Date | undefined) => void) | React.Dispatch<React.SetStateAction<Date>>;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function DatePicker({ date, setDate, onSelect, mode, className, disabled, autoFocus }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Se onSelect è fornito, usalo invece di setDate
  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      if (onSelect) onSelect(newDate);
      else if (setDate) setDate(newDate);
      
      // Chiudi automaticamente il popover dopo la selezione
      setOpen(false);
      
      // Passa al campo successivo dopo un breve ritardo per permettere la chiusura del popover
      setTimeout(() => {
        const currentElement = document.activeElement as HTMLElement;
        if (currentElement) {
          // Trova il prossimo elemento focusabile (input, select, button, textarea)
          const form = currentElement.closest('form');
          if (form) {
            const focusableElements = form.querySelectorAll(
              'input:not([disabled]), select:not([disabled]), button:not([disabled]), textarea:not([disabled])'
            );
            const currentIndex = Array.from(focusableElements).indexOf(currentElement);
            const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
            if (nextElement) {
              nextElement.focus();
            }
          }
        }
      }, 100);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-8 text-sm",
            !date && "text-muted-foreground",
            className
          )}
          onClick={() => setOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy", { locale: it }) : <span>Seleziona una data</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode={mode || "single"}
          selected={date}
          onSelect={handleDateChange}
          initialFocus={autoFocus !== false}
          locale={it}
        />
      </PopoverContent>
    </Popover>
  );
}