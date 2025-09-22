import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

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
  
  // Nome del FLUPSY
  const flupsyName = flupsyBaskets.length > 0 ? 
    `FLUPSY ${flupsyId}` : 
    `FLUPSY ${flupsyId}`;
  
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
  
  // Funzione per ottenere la classe CSS appropriata per un cestello
  const getBasketClass = (basket: Basket | undefined) => {
    if (!basket) {
      return 'bg-gray-100 dark:bg-gray-800'; // Posizione vuota
    }
    
    if (isBasketSelected(basket.id)) {
      if (mode === 'source') {
        return 'bg-blue-500 hover:bg-blue-600 text-white'; // Cestello origine
      } else {
        return 'bg-green-500 hover:bg-green-600 text-white'; // Cestello destinazione
      }
    } else if (mode === 'source') {
      return 'bg-white dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 border-2 border-blue-500'; // Cestello selezionabile come origine
    } else if (mode === 'destination') {
      return 'bg-white dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-900 border-2 border-green-500'; // Cestello selezionabile come destinazione
    }
    
    // Cestello non selezionabile (stato non appropriato)
    return 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed';
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
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {flupsyName}
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
                              "h-16 rounded-md p-2 flex flex-col items-center justify-center transition-colors cursor-pointer",
                              getBasketClass(basket)
                            )}
                            onClick={() => handlePositionClick(row, position)}
                            role="button"
                            tabIndex={0}
                          >
                            {basket ? (
                              <div className="text-center w-full h-full flex flex-col">
                                {/* HEADER PROMINENTE - Numero Cestello e Ciclo */}
                                <div className="bg-black/10 dark:bg-white/10 px-2 py-1 rounded-t-md mb-1 -mx-2 -mt-2">
                                  <div className="font-bold text-sm truncate">
                                    Cestello #{basket.physicalNumber}
                                  </div>
                                  <div className="text-xs font-medium truncate">
                                    Ciclo: {basket.currentCycleId || 'N/A'}
                                  </div>
                                </div>
                                
                                {/* Posizione */}
                                <div className="text-xs font-medium mb-1">
                                  {row}{position}
                                </div>
                                
                                {/* Contenuto principale - Taglia */}
                                <div className="flex-1 flex flex-col justify-center">
                                  {basket.size?.code && (
                                    <div className="text-xs font-semibold">{basket.size.code}</div>
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