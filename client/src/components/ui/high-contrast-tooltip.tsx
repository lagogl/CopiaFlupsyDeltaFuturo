import React from 'react';
import { TooltipContent } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HighContrastTooltipProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente personalizzato per il tooltip che garantisce alta leggibilità
 * con sfondo bianco, testo scuro e bordo visibile
 */
const HighContrastTooltip = ({ 
  children, 
  className = "" 
}: HighContrastTooltipProps) => (
  <TooltipContent className={cn(
    "bg-white text-gray-900 border-2 border-gray-300 shadow-md",
    className
  )}>
    {children}
  </TooltipContent>
);

export { HighContrastTooltip };