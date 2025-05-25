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
    
    // Verifica se il cestello è selezionato per vendita (gestito dalla pagina padre)
    const isForSale = basket.state === 'for_sale' || basket.state === 'sold';
    
    // Verifica se il cestello è sia origine che destinazione
    const isSourceAndDestination = isBasketSelected(basket.id) && 
      selectedBaskets.some(id => id === basket.id) && 
      mode === 'destination';
    
    if (isSourceAndDestination) {
      return 'bg-purple-500 hover:bg-purple-600 text-white border-2 border-yellow-400'; // Cestello sia origine che destinazione
    } else if (isBasketSelected(basket.id)) {
      if (mode === 'source') {
        return 'bg-blue-500 hover:bg-blue-600 text-white'; // Cestello origine
      } else if (isForSale) {
        return 'bg-red-500 hover:bg-red-600 text-white'; // Cestello destinazione per vendita
      } else {
        return 'bg-green-500 hover:bg-green-600 text-white'; // Cestello destinazione normale
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
  
  // Calcola il totale degli animali per taglia dai cestelli selezionati
  const calculateTotalsBySize = () => {
    // Ottieni i cestelli selezionati
    const selectedBasketsDetails = baskets.filter(b => 
      isBasketSelected(b.id) && b.flupsyId === Number(flupsyId)
    );
    
    // Raggruppa per taglia
    const sizeGroups: Record<string, {
      code: string,
      totalAnimals: number,
      basketCount: number
    }> = {};
    
    // Processa ogni cestello selezionato
    selectedBasketsDetails.forEach(basket => {
      if (basket.size?.code && basket.lastOperation?.animalCount) {
        const sizeCode = basket.size.code;
        
        if (!sizeGroups[sizeCode]) {
          sizeGroups[sizeCode] = {
            code: sizeCode,
            totalAnimals: 0,
            basketCount: 0
          };
        }
        
        sizeGroups[sizeCode].totalAnimals += basket.lastOperation.animalCount;
        sizeGroups[sizeCode].basketCount += 1;
      }
    });
    
    // Converti in array per facilitare il rendering
    return Object.values(sizeGroups);
  };
  
  // Ottiene i totali calcolati
  const sizeTotals = calculateTotalsBySize();
  
  // Calcola il totale generale
  const grandTotal = sizeTotals.reduce((sum, size) => sum + size.totalAnimals, 0);

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
      
      {/* Contatore degli animali selezionati per taglia - SEMPRE VISIBILE */}
      <div className="mb-4 p-3 border-2 rounded-md bg-blue-50 border-blue-300">
        <h4 className="text-sm font-semibold mb-2 text-blue-800 flex justify-between">
          <span>Cestelli selezionati: {selectedBaskets.length}</span>
          <span className="font-bold">Totale animali: {grandTotal.toLocaleString()}</span>
        </h4>
        {mode === 'source' && selectedBaskets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sizeTotals.map((size) => (
              <div key={size.code} className="p-2 bg-white rounded border-2 border-blue-300">
                <div className="font-medium text-sm text-center">{size.code}</div>
                <div className="flex justify-between text-xs">
                  <span>{size.basketCount} cestelli</span>
                  <span className="font-bold">{size.totalAnimals.toLocaleString()} animali</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-blue-600 py-2 bg-white rounded border border-blue-200">
            {mode === 'source' ? 
              "Seleziona cestelli di origine per vedere i totali per taglia" :
              "Conteggio disponibile nella fase di selezione origine"}
          </div>
        )}
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
                            <div className="text-xs font-semibold mb-1">
                              {row}{position}
                            </div>
                            {basket ? (
                              <div className="text-center">
                                <div className="font-bold text-sm">#{basket.physicalNumber}</div>
                                <div className="flex flex-col gap-0.5 text-xs">
                                  {basket.size?.code && <span>{basket.size.code}</span>}
                                  {basket.lastOperation?.animalCount && (
                                    <span>
                                      {basket.lastOperation.animalCount.toLocaleString()} anim.
                                    </span>
                                  )}
                                  {basket.currentCycleId && (
                                    <span>Ciclo #{basket.currentCycleId}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500 dark:text-gray-400">Vuoto</div>
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