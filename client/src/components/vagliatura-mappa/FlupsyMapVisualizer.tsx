import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon, Euro } from 'lucide-react';

// Utility per formattare i numeri grandi in modo più compatto
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Tipi di dati
interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number | null;
  position: number | null;
  row: string | null;
  state: string;
  currentCycleId: number | null;
  isSourceBasket?: boolean; // Flag per indicare se il cestello è stato selezionato come origine
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
  maxPositions?: number; // Numero massimo di posizioni per FLUPSY
  sourceBasketIds?: number[]; // Array di ID dei cestelli selezionati come origine (per la modalità destinazione)
  soldBasketIds?: number[]; // Array di ID dei cestelli destinati alla vendita
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
  showTooltips = true,
  maxPositions = 10,
  sourceBasketIds = [],
  soldBasketIds = []
}: FlupsyMapVisualizerProps) {
  // Trova i cestelli del FLUPSY selezionato
  const flupsyBaskets = baskets.filter(b => b.flupsyId === Number(flupsyId));
  
  // Calcola il numero di posizioni per riga (assumendo 2 file)
  // Se maxPositions è 10, avremo 5 posizioni per riga
  // Se maxPositions è 20, avremo 10 posizioni per riga, ecc.
  const positionsPerRow = Math.ceil(maxPositions / 2);
  console.log(`FLUPSY ${flupsyId} ha ${maxPositions} posizioni totali, ${positionsPerRow} per riga`);
  
  // Definizione delle file del FLUPSY (default: DX e SX)
  const rows = ['DX', 'SX'];
  
  // Nome del FLUPSY
  const flupsyName = flupsyBaskets.length > 0 ? 
    `FLUPSY ${flupsyId}` : 
    `FLUPSY ${flupsyId}`;
  
  // Funzione per ottenere un cestello in base alla posizione
  const getBasketAtPosition = (row: string, position: number): Basket | undefined => {
    // Cerca il cestello nella posizione specificata
    const basket = baskets.find(b => 
      b.flupsyId === Number(flupsyId) && 
      b.row === row && 
      b.position === position
    );
    
    // Per debug, registra i dati del cestello trovato
    if (basket) {
      console.log('Cestello trovato in posizione', row, position, ':', basket);
      console.log('Dati operazione:', basket.lastOperation);
      console.log('Dati taglia:', basket.size);
    }
    
    return basket;
  };
  
  // Funzione per verificare se un cestello è selezionato
  const isBasketSelected = (basketId: number | undefined): boolean => {
    if (!basketId) return false;
    return selectedBaskets.includes(basketId);
  };
  
  // Funzione per verificare se un cestello può essere selezionato
  const isBasketSelectable = (basket: Basket | undefined): boolean => {
    if (!basket) return false;
    
    // Se siamo in modalità origine, qualsiasi cestello con ciclo attivo è selezionabile
    if (mode === 'source') {
      return basket.currentCycleId !== null && basket.state === 'active';
    }
    
    // In modalità destinazione, un cestello è selezionabile se:
    // 1. Non ha un ciclo attivo (cesta vuota/disponibile), oppure
    // 2. È già stato selezionato come cestello origine (è nell'array sourceBasketIds)
    const hasActiveCycle = basket.currentCycleId !== null && basket.state === 'active';
    const isOriginBasket = sourceBasketIds.includes(basket.id);
    
    // Selezionabile se:
    // - Non ha ciclo attivo (cesta vuota/disponibile) OPPURE
    // - È un cestello origine (può essere sia origine che destinazione)
    return !hasActiveCycle || isOriginBasket;
  };
  
  // Funzione per gestire il click su una posizione
  const handlePositionClick = (row: string, position: number) => {
    const basket = getBasketAtPosition(row, position);
    
    if (basket) {
      // Verifica se il cestello può essere selezionato
      if (isBasketSelectable(basket)) {
        // Se c'è un cestello in questa posizione e può essere selezionato, invia l'evento di click
        onBasketClick(basket);
      } else {
        // Se il cestello non può essere selezionato, mostra un messaggio di avviso nel console
        console.log(`Cestello #${basket.physicalNumber} non selezionabile: ha un ciclo attivo e non è un cestello origine`);
      }
    } else {
      console.log(`Nessun cestello nella posizione ${row}${position}`);
    }
  };
  
  // Funzione per ottenere la classe CSS appropriata per un cestello
  const getBasketClass = (basket: Basket | undefined) => {
    if (!basket) {
      return 'bg-gray-100 dark:bg-gray-800'; // Posizione vuota
    }
    
    // Verifica se il cestello può essere selezionato
    const canBeSelected = isBasketSelectable(basket);
    
    // Verifica se il cestello è selezionato per vendita (gestito dalla pagina padre)
    const isForSale = basket.state === 'for_sale' || basket.state === 'sold';
    
    // Verifica se il cestello è sia origine che destinazione
    const isSourceAndDestination = basket.isSourceBasket && 
      isBasketSelected(basket.id) && 
      mode === 'destination';
    
    if (isSourceAndDestination) {
      return 'bg-purple-500 hover:bg-purple-600 text-white border-2 border-yellow-400'; // Cestello sia origine che destinazione
    } else if (basket.isSourceBasket && mode === 'destination') {
      // Cestello selezionato come origine nella vista destinazione
      return 'bg-blue-500 hover:bg-blue-600 text-white'; 
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
      // Se è in modalità destinazione ma non può essere selezionato (ha un ciclo attivo e non è un cestello origine)
      if (!canBeSelected) {
        return 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-60'; // Cestello non selezionabile
      }
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
    
    // Determina la taglia mostrata
    let sizeCode = basket.size?.code;
    if (!sizeCode && basket.lastOperation?.animalsPerKg) {
      // Se non c'è taglia ma ci sono animali per kg, calcoliamo la taglia
      sizeCode = getSizeCodeFromAnimalsPerKg(basket.lastOperation.animalsPerKg);
      tooltip += `\nTaglia calcolata: ${sizeCode}`;
    } else if (sizeCode) {
      tooltip += `\nTaglia: ${sizeCode}`;
    }
    
    if (basket.lastOperation?.animalsPerKg) {
      tooltip += `\nAnimali/kg: ${basket.lastOperation.animalsPerKg.toLocaleString()}`;
    }
    
    if (basket.lastOperation?.totalWeight) {
      tooltip += `\nPeso totale: ${basket.lastOperation.totalWeight.toLocaleString()} g`;
    }
    
    if (basket.lastOperation?.date) {
      tooltip += `\nData: ${new Date(basket.lastOperation.date).toLocaleDateString()}`;
    }
    
    return tooltip;
  };
  
  // Funzione per determinare la taglia in base agli animali per kg
  const getSizeCodeFromAnimalsPerKg = (animalsPerKg: number): string => {
    // Valori basati sulla tabella sizes
    const sizeRanges = [
      { code: 'TP-10000', min: 801, max: 1200 },
      { code: 'TP-9000', min: 1201, max: 1800 },
      { code: 'TP-8000', min: 1801, max: 2300 },
      { code: 'TP-7000', min: 2301, max: 3000 },
      { code: 'TP-6000', min: 3001, max: 3900 },
      { code: 'TP-5000', min: 3901, max: 7500 },
      { code: 'TP-4000', min: 7501, max: 12500 },
      { code: 'TP-3500', min: 12501, max: 19000 },
      { code: 'TP-3000', min: 19001, max: 32000 },
      { code: 'TP-2800', min: 32001, max: 40000 },
      { code: 'TP-2500', min: 40001, max: 60000 },
      { code: 'TP-2200', min: 60001, max: 70000 },
      { code: 'TP-2000', min: 70001, max: 97000 },
      { code: 'TP-1900', min: 97001, max: 120000 },
      { code: 'TP-1800', min: 120001, max: 190000 },
      { code: 'TP-1500', min: 190001, max: 300000 },
      { code: 'TP-1260', min: 300001, max: 350000 },
      { code: 'TP-1140', min: 350001, max: 600000 },
      { code: 'TP-1000', min: 600001, max: 880000 },
      { code: 'TP-800', min: 880001, max: 1500000 },
      { code: 'TP-700', min: 1500001, max: 1800000 },
      { code: 'TP-600', min: 1800001, max: 3400000 },
      { code: 'TP-500', min: 3400001, max: 5000000 },
      { code: 'TP-450', min: 5000001, max: 7600000 },
      { code: 'TP-315', min: 7600001, max: 16000000 },
      { code: 'TP-200', min: 16000001, max: 42000000 },
      { code: 'TP-180', min: 42000001, max: 100000000 }
    ];
    
    // Trova la taglia corrispondente
    const matchingSize = sizeRanges.find(
      range => animalsPerKg >= range.min && animalsPerKg <= range.max
    );
    
    return matchingSize ? matchingSize.code : 'Sconosciuta';
  };
  
  // Funzione per ottenere dati completi del cestello, inclusa l'ultima operazione
  const getBasketCompleteData = (basket: Basket): Basket => {
    // Se il cestello ha già tutti i dati necessari, lo restituiamo così com'è
    if (basket.lastOperation?.animalCount && basket.size?.code) {
      return basket;
    }
    
    // Copia del cestello per le modifiche
    const updatedBasket = { ...basket };
    
    // Se il cestello ha un'operazione ma non ha una taglia, cerchiamo di determinarla
    if (basket.lastOperation?.animalsPerKg && !basket.size?.code) {
      const sizeCode = getSizeCodeFromAnimalsPerKg(basket.lastOperation.animalsPerKg);
      updatedBasket.size = {
        id: 0, // ID placeholder
        code: sizeCode,
        min: 0,
        max: 0
      };
    }
    
    return updatedBasket;
  };
  
  // Calcola il totale degli animali per taglia dai cestelli selezionati
  const calculateTotalsBySize = () => {
    // Ottieni i cestelli selezionati
    const selectedBasketsDetails = baskets
      .filter(b => isBasketSelected(b.id) && b.flupsyId === Number(flupsyId))
      .map(getBasketCompleteData); // Aggiorna i dati mancanti
    
    // Raggruppa per taglia
    const sizeGroups: Record<string, {
      code: string,
      totalAnimals: number,
      basketCount: number
    }> = {};
    
    // Processa ogni cestello selezionato
    selectedBasketsDetails.forEach(basket => {
      // Determina la taglia e il numero di animali
      const sizeCode = basket.size?.code || 
                      (basket.lastOperation?.animalsPerKg ? 
                        getSizeCodeFromAnimalsPerKg(basket.lastOperation.animalsPerKg) : 
                        'Sconosciuta');
      
      const animalCount = basket.lastOperation?.animalCount || 0;
      
      if (!sizeGroups[sizeCode]) {
        sizeGroups[sizeCode] = {
          code: sizeCode,
          totalAnimals: 0,
          basketCount: 0
        };
      }
      
      sizeGroups[sizeCode].totalAnimals += animalCount;
      sizeGroups[sizeCode].basketCount += 1;
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
              <div className={cn(
                "grid gap-1",
                positionsPerRow <= 5 ? "grid-cols-5" : 
                positionsPerRow <= 8 ? "grid-cols-8" : 
                positionsPerRow <= 10 ? "grid-cols-10" : "grid-cols-12"
              )}>
                {Array.from({ length: positionsPerRow }).map((_, posIndex) => {
                  const position = posIndex + 1;
                  const basket = getBasketAtPosition(row, position);
                  
                  return (
                    <TooltipProvider key={`${row}-${position}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "rounded-md p-1 flex flex-col items-center justify-center transition-colors cursor-pointer",
                              positionsPerRow > 5 ? "h-auto" : "h-16",
                              getBasketClass(basket)
                            )}
                            onClick={() => handlePositionClick(row, position)}
                            role="button"
                            tabIndex={0}
                          >
                            <div className="text-[10px] font-medium flex items-center justify-center gap-1">
                              {row}{position} #{basket?.physicalNumber || ''}
                              {/* Icona Euro per cestelli destinati alla vendita */}
                              {basket && soldBasketIds.includes(basket.id) && (
                                <Euro className="w-3 h-3 text-yellow-400" />
                              )}
                            </div>
                            {basket ? (
                              <div className="text-center w-full">
                                {positionsPerRow > 5 ? (
                                  // Layout compatto per FLUPSY con tante posizioni
                                  <div className="flex flex-col text-[9px] leading-tight">
                                    <div className="font-semibold">
                                      {basket.size?.code || 
                                       (basket.lastOperation?.animalsPerKg 
                                        ? getSizeCodeFromAnimalsPerKg(basket.lastOperation.animalsPerKg) 
                                        : "N/D")}
                                    </div>
                                    <div className="text-[8px]">
                                      {basket.lastOperation?.animalCount 
                                        ? (basket.lastOperation.animalCount >= 1000000 
                                            ? (basket.lastOperation.animalCount / 1000000).toFixed(1) + 'M'
                                            : basket.lastOperation.animalCount >= 1000
                                            ? (basket.lastOperation.animalCount / 1000).toFixed(1) + 'K'
                                            : basket.lastOperation.animalCount.toString())
                                        : "0"} anim.
                                    </div>
                                  </div>
                                ) : (
                                  // Layout normale per FLUPSY con poche posizioni
                                  <div className="flex flex-col gap-0.5 text-xs text-center">
                                    <div className="font-medium">
                                      {basket.size?.code || 
                                       (basket.lastOperation?.animalsPerKg 
                                        ? getSizeCodeFromAnimalsPerKg(basket.lastOperation.animalsPerKg) 
                                        : "Senza taglia")}
                                    </div>
                                    <div className="font-semibold">
                                      {basket.lastOperation?.animalCount 
                                        ? basket.lastOperation.animalCount.toLocaleString() 
                                        : "0"} anim.
                                    </div>
                                    <div>
                                      {basket.lastOperation?.animalsPerKg 
                                        ? basket.lastOperation.animalsPerKg.toLocaleString() 
                                        : "0"} per kg
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">Vuoto</div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black text-white border-0">
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