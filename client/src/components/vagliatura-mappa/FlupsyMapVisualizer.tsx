import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

// Mappa colori per le taglie
const SIZE_COLORS: Record<string, {bg: string; border: string; text: string; bar: string}> = {
  'TP-10000': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900', bar: 'bg-red-500' },
  'TP-9000': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', bar: 'bg-orange-500' },
  'TP-8000': { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', bar: 'bg-amber-500' },
  'TP-7000': { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-900', bar: 'bg-yellow-500' },
  'TP-6000': { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-900', bar: 'bg-lime-500' },
  'TP-5000': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900', bar: 'bg-green-500' },
  'TP-4000': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-900', bar: 'bg-emerald-500' },
  'TP-3500': { bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-900', bar: 'bg-teal-500' },
  'TP-3000': { bg: 'bg-cyan-50', border: 'border-cyan-300', text: 'text-cyan-900', bar: 'bg-cyan-500' },
  'TP-2800': { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-900', bar: 'bg-sky-500' },
  'TP-2500': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', bar: 'bg-blue-500' },
  'TP-2200': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', bar: 'bg-indigo-500' },
  'TP-2000': { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-900', bar: 'bg-violet-500' },
  'TP-1900': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', bar: 'bg-purple-500' },
  'TP-1800': { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-900', bar: 'bg-fuchsia-500' },
  'TP-1500': { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-900', bar: 'bg-pink-500' },
  'TP-1260': { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-900', bar: 'bg-rose-500' }
};

// Tipi di dati
interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number | null;
  position: number | null;
  row: string | null;
  state: string;
  currentCycleId: number | null;
  lastOperation?: {
    animalCount: number;
    totalWeight: number | null;
    animalsPerKg: number | null;
    date: string;
  };
  size?: {
    id: number;
    code: string;
    min: number;
    max: number;
  };
}

interface FlupsyMapVisualizerProps {
  flupsyId: string | number;
  flupsyName?: string; // Nome del FLUPSY da visualizzare
  baskets: Basket[];
  selectedBaskets: number[]; // Array di ID dei cestelli selezionati
  onBasketClick: (basket: Basket) => void;
  mode: 'source' | 'destination'; // Modalità di selezione
  showTooltips?: boolean;
}

/**
 * Componente per visualizzare una mappa grafica del FLUPSY con i suoi cestelli
 */
export default function FlupsyMapVisualizer({
  flupsyId,
  flupsyName,
  baskets,
  selectedBaskets,
  onBasketClick,
  mode,
  showTooltips = true
}: FlupsyMapVisualizerProps) {
  // Trova i cestelli del FLUPSY selezionato
  const flupsyBaskets = baskets.filter(b => b.flupsyId === Number(flupsyId));
  
  // Default: 10 posizioni per FLUPSY (5 per riga)
  const positionsPerRow = 5;
  
  // Definizione delle file del FLUPSY (default: DX e SX)
  const rows = ['DX', 'SX'];
  
  // Nome del FLUPSY - usa il nome fornito o fallback all'ID
  const displayName = flupsyName || `FLUPSY ${flupsyId}`;
  
  // Funzione per ottenere un cestello in base alla posizione
  const getBasketAtPosition = (row: string, position: number): Basket | undefined => {
    return baskets.find(b => 
      b.flupsyId === Number(flupsyId) && 
      b.row === row && 
      b.position === position
    );
  };
  
  // Funzione per verificare se un cestello è selezionato
  const isBasketSelected = (basketId: number | undefined): boolean => {
    if (!basketId) return false;
    return selectedBaskets.includes(basketId);
  };
  
  // Funzione per gestire il click su una posizione
  const handlePositionClick = (row: string, position: number) => {
    const basket = getBasketAtPosition(row, position);
    
    if (basket) {
      // Se c'è un cestello in questa posizione, invia l'evento di click
      onBasketClick(basket);
    } else {
      console.log(`Nessun cestello nella posizione ${row}${position}`);
    }
  };
  
  // Funzione per ottenere le classi di colore per la taglia
  const getSizeColorClasses = (sizeCode?: string) => {
    if (!sizeCode) {
      return {
        bg: 'bg-gray-50 dark:bg-gray-800',
        border: 'border-gray-300 dark:border-gray-600',
        text: 'text-gray-900 dark:text-gray-100',
        bar: 'bg-gray-400'
      };
    }
    
    return SIZE_COLORS[sizeCode] || {
      bg: 'bg-gray-50 dark:bg-gray-800',
      border: 'border-gray-300 dark:border-gray-600',
      text: 'text-gray-900 dark:text-gray-100',
      bar: 'bg-gray-400'
    };
  };
  
  // Funzione per ottenere le classi di selezione (ring invece di background)
  const getSelectionRingClasses = (selected: boolean, mode: string) => {
    if (!selected) return '';
    
    if (mode === 'source') {
      return 'ring-2 ring-blue-500 shadow-lg';
    } else {
      return 'ring-2 ring-green-500 shadow-lg';
    }
  };
  
  // Funzione per ottenere la classe CSS appropriata per un cestello
  const getBasketClass = (basket: Basket | undefined) => {
    if (!basket) {
      return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600';
    }
    
    const sizeColors = getSizeColorClasses(basket.size?.code);
    const isSelected = isBasketSelected(basket.id);
    const selectionRing = getSelectionRingClasses(isSelected, mode);
    
    const baseClasses = `${sizeColors.bg} ${sizeColors.border} ${sizeColors.text} border-2 transition-all duration-200`;
    
    if (isSelected) {
      return `${baseClasses} ${selectionRing}`;
    } else if (mode === 'source') {
      return `${baseClasses} hover:ring-1 hover:ring-blue-300 cursor-pointer`;
    } else if (mode === 'destination') {
      return `${baseClasses} hover:ring-1 hover:ring-green-300 cursor-pointer`;
    }
    
    return `${baseClasses} cursor-not-allowed opacity-50`;
  };
  
  // Genera i tooltip per i cestelli
  const getBasketTooltip = (basket: Basket | undefined) => {
    if (!basket) return "Posizione vuota";
    
    const isSelected = isBasketSelected(basket.id);
    
    let tooltip = `Cestello #${basket.physicalNumber}`;
    
    if (isSelected) {
      tooltip += ` (Selezionato)`;
    }
    
    if (basket.lastOperation?.animalCount) {
      tooltip += `\nAnimali: ${basket.lastOperation.animalCount.toLocaleString()}`;
    }
    
    if (basket.size?.code) {
      tooltip += `\nTaglia: ${basket.size.code}`;
    }
    
    if (basket.lastOperation?.animalsPerKg) {
      tooltip += `\nAnimali/kg: ${basket.lastOperation.animalsPerKg.toLocaleString()}`;
    }
    
    return tooltip;
  };
  
  return (
    <div className="w-full">
      <div className="mb-4 space-y-3">
        {/* Header con titolo e modalità */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            {displayName}
            {showTooltips && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="ml-1 inline-block h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>FLUPSY {flupsyId}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h3>
          <div className="flex gap-2">
            {mode === 'source' && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs">Origine</span>
              </div>
            )}
            {mode === 'destination' && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs">Destinazione</span>
              </div>
            )}
          </div>
        </div>
        
      </div>
      
      <div className="border rounded-lg p-4">
        {/* Contenitore principale del FLUPSY */}
        <div className="flex flex-col gap-4">
          {/* Genera le righe del FLUPSY */}
          {rows.map((row) => (
            <div key={row} className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline">{row}</Badge>
                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>
              </div>
              
              {/* Genera le posizioni per questa riga */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: positionsPerRow }).map((_, posIndex) => {
                  const position = posIndex + 1;
                  const basket = getBasketAtPosition(row, position);
                  
                  return (
                    <TooltipProvider key={`${row}-${position}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "min-h-20 rounded-md p-2 flex flex-col relative transition-all cursor-pointer overflow-hidden",
                              getBasketClass(basket)
                            )}
                            onClick={() => handlePositionClick(row, position)}
                            role="button"
                            tabIndex={0}
                            data-testid={basket ? `card-basket-${basket.id}` : `empty-position-${row}${position}`}
                          >
                            {basket ? (
                              <div className="text-center w-full h-full flex flex-col gap-1">
                                {/* Barra colorata superiore per la taglia */}
                                <div className={cn(
                                  "absolute top-0 left-0 right-0 h-1 rounded-t-md",
                                  getSizeColorClasses(basket.size?.code).bar
                                )} />
                                
                                {/* Header - Numero Cestello */}
                                <div className="pt-1">
                                  <div className="font-bold text-xs truncate">
                                    Cestello #{basket.physicalNumber}
                                  </div>
                                </div>
                                
                                {/* Posizione */}
                                <div className="text-xs font-medium">
                                  {row}{position}
                                </div>
                                
                                {/* Taglia con testo colorato */}
                                <div className="flex-1 flex items-center justify-center">
                                  {basket.size?.code ? (
                                    <span 
                                      className={cn(
                                        "text-xs font-bold px-1 py-0.5 max-w-full truncate",
                                        getSizeColorClasses(basket.size.code).text
                                      )}
                                      data-testid={`text-size-${basket.id}`}
                                    >
                                      {basket.size.code}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-500">N/D</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center w-full h-full flex flex-col justify-center">
                                <div className="text-xs font-semibold mb-1">
                                  {row}{position}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Vuoto</div>
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="whitespace-pre-line">{getBasketTooltip(basket)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}