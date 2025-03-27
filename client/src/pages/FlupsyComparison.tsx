import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, addDays, differenceInWeeks } from 'date-fns';
import { Calendar, Clock, ArrowRight, Info, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { getTargetSizeForWeight, getFutureWeightAtDate, getSizeColor } from '@/lib/utils';
import SizeGrowthTimeline from '@/components/SizeGrowthTimeline';

// Componente personalizzato per il tooltip che garantisce alta leggibilità
const HighContrastTooltip = ({ children, className = "" }) => (
  <TooltipContent className={`bg-white text-gray-900 border-2 border-gray-300 shadow-md ${className}`}>
    {children}
  </TooltipContent>
);

// Helper function per ottenere il colore di una taglia
/**
 * Sequenza di colori per taglia:
 * - T1 (più piccola): Blu
 * - T2: Ciano
 * - T3: Verde acqua
 * - T4: Verde
 * - T5: Verde lime
 * - T6: Ambra
 * - T7 (più grande in T): Arancione
 * - TP-3000: Rosso (19.001-32.000/kg)
 * - TP-2000: Rosa scuro (12.001-19.000/kg)
 * - TP-1000: Rosa (6.001-12.000/kg)
 * - TP-500: Viola (1-6.000/kg)
 * - TP-10000+ o taglie superiori: Nero con testo bianco
 */
const getSizeColorWithBorder = (sizeCode: string): string => {
  // Funzione locale che restituisce colori con contrasto adeguato per la visualizzazione
  // Usando !important (in Tailwind con '!') per assicurare che i colori non vengano sovrascritti
  
  // Verifica se il codice della taglia è TP-10000 o superiore
  if (sizeCode.startsWith('TP-') && parseInt(sizeCode.replace('TP-', '')) >= 10000) {
    return 'bg-black !text-white !border-gray-800';
  }
  
  switch (sizeCode) {
    case 'T1':
      return 'bg-blue-500 !text-white !border-blue-700';
    case 'T2':
      return 'bg-cyan-500 !text-white !border-cyan-700';
    case 'T3':
      return 'bg-teal-500 !text-white !border-teal-700';
    case 'T4':
      return 'bg-green-500 !text-white !border-green-700';
    case 'T5':
      return 'bg-lime-500 !text-white !border-lime-700';
    case 'T6':
      return 'bg-amber-500 !text-white !border-amber-700';
    case 'T7':
      return 'bg-orange-500 !text-white !border-orange-700';
    case 'TP-3000':
      return 'bg-red-500 !text-white !border-red-700';
    case 'TP-2000':
      return 'bg-rose-500 !text-white !border-rose-700';
    case 'TP-1000':
      return 'bg-pink-500 !text-white !border-pink-700';
    case 'TP-500':
      return 'bg-purple-500 !text-white !border-purple-700';
    default:
      return 'bg-gray-200 !text-gray-800 !border-gray-400';
  }
};

// Questo componente visualizza il confronto tra lo stato attuale e futuro del FLUPSY
export default function FlupsyComparison() {
  // Stati per le impostazioni di visualizzazione
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [currentTabId, setCurrentTabId] = useState<string>("data-futuro");
  const [daysInFuture, setDaysInFuture] = useState<number>(30);
  
  // Verifica che il valore sia compreso tra 5 e 180
  useEffect(() => {
    if (daysInFuture < 5) setDaysInFuture(5);
    if (daysInFuture > 180) setDaysInFuture(180);
  }, [daysInFuture]);
  const [targetSizeCode, setTargetSizeCode] = useState<string>("T5");
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = normale, 2 = medio, 3 = grande

  // Fetch dei dati necessari
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles'],
  });

  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });

  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgrs'],
  });

  // Inizializza il FLUPSY selezionato se ce n'è solo uno disponibile
  useMemo(() => {
    if (flupsys && flupsys.length > 0 && !selectedFlupsyId) {
      setSelectedFlupsyId(flupsys[0].id);
    }
  }, [flupsys, selectedFlupsyId]);

  // Helper function per ottenere il ciclo di un cestello
  const getCycleForBasket = (basketId: number) => {
    if (!cycles) return null;
    return cycles.find(c => c.basketId === basketId && c.state === 'active') || null;
  };
  
  // Helper function per ottenere le operazioni di un cestello
  const getOperationsForBasket = (basketId: number) => {
    if (!operations) return [];
    return operations.filter(op => op.basketId === basketId);
  };

  // Ottiene l'operazione più recente per un cestello
  const getLatestOperationForBasket = (basketId: number) => {
    const basketOperations = getOperationsForBasket(basketId);
    if (basketOperations.length === 0) return null;
    
    // Ordina per data (più recente prima)
    return [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };

  // Calcola il peso futuro di un cestello
  const calculateFutureWeight = (basketId: number, daysToAdd: number) => {
    const latestOperation = getLatestOperationForBasket(basketId);
    if (!latestOperation || latestOperation.animalsPerKg === null) return null;
    
    // Calcola il peso attuale in mg
    const currentWeight = latestOperation.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : 0;
    const measurementDate = new Date(latestOperation.date);
    
    // Ottieni la percentuale SGR giornaliera (convertita da percentuale mensile)
    let sgrDailyPercentage = 0.067; // Valore di default (2% mensile = ~0.067% al giorno)
    if (sgrs && sgrs.length > 0) {
      // Usa il valore SGR del mese corrente se disponibile
      const currentMonth = format(new Date(), 'MMMM').toLowerCase();
      const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
      if (currentSgr) {
        // Usa direttamente il valore giornaliero
        sgrDailyPercentage = currentSgr.percentage;
      } else {
        // Altrimenti usa il valore medio delle percentuali giornaliere
        sgrDailyPercentage = sgrs.reduce((acc, sgr) => acc + sgr.percentage, 0) / sgrs.length;
      }
    }
    
    // Calcola il peso futuro usando la formula corretta: Pf = Pi * e^(SGR*t)
    const targetDate = addDays(new Date(), daysToAdd);
    
    // Calcolo dei giorni tra la data di misurazione e la data target
    const days = Math.floor((targetDate.getTime() - measurementDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Usa la formula con e^(SGR*t) considerando i diversi tassi SGR per mese
    let totalSGREffect = 0;
    let currentDate = new Date(measurementDate);
    
    for (let i = 0; i < days; i++) {
      // Aggiorniamo la data corrente aggiungendo un giorno
      if (i > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      const month = format(currentDate, 'MMMM').toLowerCase();
      
      // Trova il tasso SGR per questo mese (in percentuale)
      let dailyRate = sgrDailyPercentage;
      if (sgrs) {
        const monthSgr = sgrs.find(sgr => sgr.month.toLowerCase() === month);
        if (monthSgr) {
          dailyRate = monthSgr.percentage;
        }
      }
      
      // Aggiungi il tasso SGR all'effetto cumulativo (è già in decimale)
      totalSGREffect += dailyRate;
    }
    
    // Applica la formula completa: Pf = Pi * e^(SGR*t)
    const simulatedWeight = currentWeight * Math.exp(totalSGREffect);
    
    return Math.round(simulatedWeight);
  };

  // Determina se un cestello raggiungerà una taglia target
  const willReachTargetSize = (basketId: number, targetSize: string) => {
    const latestOperation = getLatestOperationForBasket(basketId);
    if (!latestOperation || latestOperation.animalsPerKg === null) return false;
    
    // Calcola il peso attuale in mg
    const currentWeight = latestOperation.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : 0;
    
    // Trova la taglia target dal database
    const targetSizeObj = sizes ? sizes.find(s => s.code === targetSize) : null;
    if (!targetSizeObj) return false;
    
    // Calcola il peso target in mg (utilizziamo il valore minimo per la taglia)
    const targetWeight = targetSizeObj.minAnimalsPerKg ? 1000000 / targetSizeObj.minAnimalsPerKg : 0;
    
    // Se il peso corrente è già maggiore del peso target, è già nella taglia target
    if (currentWeight >= targetWeight) return true;
    
    // Calcola il peso futuro a 180 giorni
    const futureWeight = calculateFutureWeight(basketId, 180);
    if (!futureWeight) return false;
    
    // Verifica se il peso futuro raggiunge il peso target
    return futureWeight >= targetWeight;
  };

  // Calcola il numero di giorni necessari per raggiungere una taglia target
  const getDaysToReachTargetSize = (basketId: number, targetSize: string) => {
    const latestOperation = getLatestOperationForBasket(basketId);
    if (!latestOperation || latestOperation.animalsPerKg === null) return null;
    
    // Calcola il peso attuale in mg
    const currentWeight = latestOperation.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : 0;
    
    // Trova la taglia target dal database
    const targetSizeObj = sizes ? sizes.find(s => s.code === targetSize) : null;
    if (!targetSizeObj) return null;
    
    // Calcola il peso target in mg (utilizziamo il valore minimo per la taglia)
    const targetWeight = targetSizeObj.minAnimalsPerKg ? 1000000 / targetSizeObj.minAnimalsPerKg : 0;
    
    // Se il peso corrente è già maggiore del peso target, è già nella taglia target
    if (currentWeight >= targetWeight) return 0;
    
    // Ottieni la percentuale SGR giornaliera (convertita da percentuale mensile)
    let sgrDailyPercentage = 0.067; // Valore di default (2% mensile = ~0.067% al giorno)
    if (sgrs && sgrs.length > 0) {
      // Usa il valore SGR del mese corrente se disponibile
      const currentMonth = format(new Date(), 'MMMM').toLowerCase();
      const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
      if (currentSgr) {
        // Usa direttamente il valore giornaliero
        sgrDailyPercentage = currentSgr.percentage;
      } else {
        // Altrimenti usa il valore medio delle percentuali giornaliere
        sgrDailyPercentage = sgrs.reduce((acc, sgr) => acc + sgr.percentage, 0) / sgrs.length;
      }
    }
    
    // Calcolo dei giorni necessari usando i valori SGR giornalieri mese per mese
    let simulationWeight = currentWeight;
    let days = 0;
    const measureDate = new Date(latestOperation.date); // Ottieni la data dalla misurazione
    let currentDate = new Date(measureDate);
    
    while (simulationWeight < targetWeight && days < 365) {
      // Determina il mese corrente per usare il tasso SGR appropriato
      const month = format(currentDate, 'MMMM').toLowerCase();
      
      // Trova il tasso SGR per questo mese
      let dailyRate = sgrDailyPercentage;
      if (sgrs) {
        const monthSgr = sgrs.find(sgr => sgr.month.toLowerCase() === month);
        if (monthSgr) {
          // Usa direttamente il valore giornaliero
          dailyRate = monthSgr.percentage;
        }
      }
      
      // Applica la crescita giornaliera usando la formula corretta: Pf = Pi * e^(SGR*t)
      // Contiamo l'effetto di un giorno con il tasso corrente (già in decimale)
      simulationWeight = simulationWeight * Math.exp(dailyRate);
      days++;
      
      // Aggiorna la data corrente per il giorno successivo
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days < 365 ? days : null;
  };

  // Prepara i dati per la visualizzazione
  const selectedFlupsy = useMemo(() => {
    if (!flupsys || !selectedFlupsyId) return null;
    return flupsys.find(f => f.id === selectedFlupsyId) || null;
  }, [flupsys, selectedFlupsyId]);

  const fluspyBaskets = useMemo(() => {
    if (!baskets || !selectedFlupsyId) return [];
    return baskets
      .filter(b => b.flupsyId === selectedFlupsyId)
      .sort((a, b) => {
        // Ordina prima per riga (SX, DX)
        if (a.row !== b.row) {
          return a.row === 'SX' ? -1 : 1;
        }
        // Poi per posizione
        return (a.position || 0) - (b.position || 0);
      });
  }, [baskets, selectedFlupsyId]);
  
  // Ottiene le dimensioni delle carte dei cestelli in base al livello di zoom
  const getBasketCardSize = () => {
    switch (zoomLevel) {
      case 1:
        return { width: 'w-44', height: 'h-22' }; // Default (aumentato)
      case 2:
        return { width: 'w-56', height: 'h-28' }; // Medio (aumentato)
      case 3:
        return { width: 'w-72', height: 'h-32' }; // Grande (aumentato ulteriormente)
      default:
        return { width: 'w-44', height: 'h-22' };
    }
  };

  // Renderizza un cestello per la visualizzazione attuale
  const renderCurrentBasket = (basket) => {
    const cardSize = getBasketCardSize();
    const width = cardSize.width;
    const height = cardSize.height;
    
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`basket-card p-2 rounded border-2 border-dashed border-gray-300 ${height} ${width} flex items-center justify-center text-gray-400 text-xs cursor-pointer`}>
              Vuoto
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            <div className="p-2 max-w-xs">
              <div className="font-medium text-gray-700 mb-1">Posizione non assegnata</div>
              <div className="text-sm text-gray-600">
                Nessun cestello presente in questa posizione.
              </div>
            </div>
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
    
    const latestOperation = getLatestOperationForBasket(basket.id);
    const cycle = getCycleForBasket(basket.id);
    
    // Calcola il peso medio attuale
    const currentWeight = latestOperation?.animalsPerKg 
      ? Math.round(1000000 / latestOperation.animalsPerKg) 
      : null;
    
    // Determina la taglia attuale
    const currentSize = currentWeight 
      ? getTargetSizeForWeight(currentWeight, sizes) 
      : null;
    
    // Classe CSS per il colore del cestello
    const colorClass = currentSize?.code 
      ? getSizeColorWithBorder(currentSize.code) 
      : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const sizeName = currentSize?.name || "N/A";
      const animalsPerKg = latestOperation?.animalsPerKg || "N/A";
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Taglia:</div>
            <div>{currentSize?.code} - {sizeName}</div>
            <div className="text-gray-500">Peso:</div>
            <div>{currentWeight} mg</div>
            <div className="text-gray-500">Animali/kg:</div>
            <div>{animalsPerKg}</div>
            {latestOperation && (
              <>
                <div className="text-gray-500">Ultima operazione:</div>
                <div>{latestOperation.type} ({format(new Date(latestOperation.date), 'dd/MM/yyyy')})</div>
              </>
            )}
            {cycle && (
              <>
                <div className="text-gray-500">Ciclo:</div>
                <div>#{cycle.id} (dal {format(new Date(cycle.startDate), 'dd/MM/yyyy')})</div>
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-3 rounded border-2 ${colorClass} ${height} ${width} flex flex-col justify-between cursor-pointer overflow-hidden`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    C#{cycle.id}
                  </Badge>
                )}
              </div>
              
              {currentSize && (
                <div className="flex flex-col w-full space-y-1 mt-1">
                  <div className="flex items-center justify-center">
                    {/* Gestione speciale per taglie TP-10000+ con sfondo nero e testo bianco */}
                    {currentSize.code.startsWith('TP-') && parseInt(currentSize.code.replace('TP-', '')) >= 10000 ? (
                      <Badge className="text-[8px] px-1.5 py-0 h-4 bg-black text-white whitespace-nowrap max-w-full overflow-hidden">
                        +TP-10000
                      </Badge>
                    ) : (
                      <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500 text-white whitespace-nowrap max-w-full overflow-hidden">
                        {currentSize.code}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-center">
                    <div>
                      <div className="text-[8px] text-gray-500">Peso</div>
                      <div className="text-[9px] font-medium">{currentWeight} mg</div>
                    </div>
                    {latestOperation?.animalsPerKg && (
                      <div>
                        <div className="text-[8px] text-gray-500">Animali/kg</div>
                        <div className="text-[9px] font-medium">{latestOperation.animalsPerKg}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            {tooltipContent()}
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Renderizza un cestello per la visualizzazione futura
  const renderFutureBasket = (basket) => {
    const cardSize = getBasketCardSize();
    const width = cardSize.width;
    const height = cardSize.height;
    
    if (!basket) return renderCurrentBasket(null);
    
    const latestOperation = getLatestOperationForBasket(basket.id);
    const cycle = getCycleForBasket(basket.id);
    
    if (!latestOperation || latestOperation.animalsPerKg === null) {
      return renderCurrentBasket(basket);
    }
    
    // Calcola il peso futuro in mg
    const futureWeight = calculateFutureWeight(basket.id, daysInFuture);
    if (!futureWeight) return renderCurrentBasket(basket);
    
    // Determina la taglia futura
    const futureSize = getTargetSizeForWeight(futureWeight, sizes);
    
    // Calcola il numero attuale di animali per kg
    const currentAnimalsPerKg = latestOperation.animalsPerKg;
    
    // Calcola il numero futuro di animali per kg
    const futureAnimalsPerKg = Math.round(1000000 / futureWeight);
    
    // Classe CSS per il colore del cestello
    const colorClass = futureSize?.code 
      ? getSizeColorWithBorder(futureSize.code) 
      : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Calcolo della percentuale di crescita
    const currentWeight = currentAnimalsPerKg ? 1000000 / currentAnimalsPerKg : 0;
    const growthPercentage = currentWeight > 0 
      ? Math.round((futureWeight / currentWeight - 1) * 100) 
      : 0;
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const operationDate = latestOperation ? new Date(latestOperation.date) : null;
      const targetDate = operationDate ? addDays(new Date(), daysInFuture) : null;
      const weeksPassed = operationDate && targetDate 
        ? differenceInWeeks(targetDate, operationDate) 
        : null;
      
      const currentSize = getTargetSizeForWeight(currentWeight, sizes);
      
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber} tra {daysInFuture} giorni</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="font-medium mb-1 col-span-2 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {targetDate ? format(targetDate, 'dd/MM/yyyy') : 'N/A'}
              {weeksPassed !== null && ` (${weeksPassed} settimane)`}
            </div>
            
            <div className="text-gray-500">Taglia attuale:</div>
            <div>{currentSize?.code} - {currentSize?.name || 'N/A'}</div>
            
            <div className="text-gray-500">Taglia futura:</div>
            <div>{futureSize?.code} - {futureSize?.name || 'N/A'}</div>
            
            <div className="text-gray-500">Peso attuale:</div>
            <div>{Math.round(currentWeight)} mg</div>
            
            <div className="text-gray-500">Peso futuro:</div>
            <div>{futureWeight} mg</div>
            
            <div className="text-gray-500">Crescita:</div>
            <div className={`font-medium ${growthPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growthPercentage > 0 ? '+' : ''}{growthPercentage}%
            </div>
            
            <div className="text-gray-500">Animali/kg attuale:</div>
            <div>{currentAnimalsPerKg}</div>
            
            <div className="text-gray-500">Animali/kg futuro:</div>
            <div>{futureAnimalsPerKg}</div>
          </div>
        </div>
      );
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-3 rounded border-2 ${colorClass} ${height} ${width} flex flex-col justify-between cursor-pointer relative overflow-hidden`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    C#{cycle.id}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col w-full space-y-1 mt-1">
                <div className="flex items-center justify-center">
                  {/* Gestione speciale per taglie TP-10000+ con sfondo nero e testo bianco */}
                  {futureSize?.code && futureSize.code.startsWith('TP-') && parseInt(futureSize.code.replace('TP-', '')) >= 10000 ? (
                    <Badge className="text-[8px] px-1.5 py-0 h-4 bg-black text-white whitespace-nowrap max-w-full overflow-hidden">
                      +TP-10000
                    </Badge>
                  ) : (
                    <Badge className="text-[8px] px-1.5 py-0 h-4 whitespace-nowrap max-w-full overflow-hidden">
                      {futureSize?.code || '?'}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-center">
                  <div>
                    <div className="text-[8px] text-gray-500">Peso</div>
                    <div className="text-[9px] font-medium">{futureWeight} mg</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-gray-500">Animali/kg</div>
                    <div className="text-[9px] font-medium">{futureAnimalsPerKg}</div>
                  </div>
                </div>
              </div>
              
              {/* Indicatore di crescita */}
              <div className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
                <Badge className={`text-[8px] px-1 py-0 h-4 ${growthPercentage >= 0 ? 'bg-green-500' : 'bg-red-500'} text-white rounded-full`}>
                  {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
                </Badge>
              </div>
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            {tooltipContent()}
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Renderizza un cestello per la visualizzazione di raggiungimento taglia
  const renderTargetSizeBasket = (basket) => {
    const cardSize = getBasketCardSize();
    const width = cardSize.width;
    const height = cardSize.height;
    
    if (!basket) return renderCurrentBasket(null);
    
    const latestOperation = getLatestOperationForBasket(basket.id);
    const cycle = getCycleForBasket(basket.id);
    
    if (!latestOperation || latestOperation.animalsPerKg === null) {
      return renderCurrentBasket(basket);
    }
    
    // Calcola il peso attuale in mg
    const currentWeight = latestOperation.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : 0;
    
    // Calcola il numero di giorni per raggiungere la taglia target
    const daysToTarget = getDaysToReachTargetSize(basket.id, targetSizeCode);
    
    // Determina la taglia attuale
    const currentSize = getTargetSizeForWeight(currentWeight, sizes);
    
    // Ottiene l'oggetto taglia target
    const targetSize = sizes ? sizes.find(s => s.code === targetSizeCode) : null;
    
    // Verifica se raggiungerà la taglia target entro 180 giorni
    const willReach = willReachTargetSize(basket.id, targetSizeCode);
    
    // Classe CSS per il colore del cestello
    let colorClass = 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Se ha già raggiunto la taglia target, usa il colore della taglia
    if (currentSize?.code === targetSizeCode) {
      colorClass = getSizeColorWithBorder(targetSizeCode);
    } 
    // Se non raggiungerà la taglia target, usa un colore rosso
    else if (!willReach) {
      colorClass = 'bg-red-100 text-red-800 border-red-300';
    } 
    // Se raggiungerà la taglia target, usa un bordo del colore target ma sfondo più chiaro
    else {
      switch (targetSizeCode) {
        case 'T1':
          colorClass = 'bg-blue-50 text-blue-800 border-blue-500 border-dashed';
          break;
        case 'T2':
          colorClass = 'bg-cyan-50 text-cyan-800 border-cyan-500 border-dashed';
          break;
        case 'T3':
          colorClass = 'bg-teal-50 text-teal-800 border-teal-500 border-dashed';
          break;
        case 'T4':
          colorClass = 'bg-green-50 text-green-800 border-green-500 border-dashed';
          break;
        case 'T5':
          colorClass = 'bg-lime-50 text-lime-800 border-lime-500 border-dashed';
          break;
        case 'T6':
          colorClass = 'bg-amber-50 text-amber-800 border-amber-500 border-dashed';
          break;
        case 'T7':
          colorClass = 'bg-orange-50 text-orange-800 border-orange-500 border-dashed';
          break;
        default:
          colorClass = 'bg-gray-50 text-gray-800 border-gray-300 border-dashed';
      }
    }
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const operationDate = latestOperation ? new Date(latestOperation.date) : null;
      const targetDate = daysToTarget !== null && operationDate 
        ? addDays(operationDate, daysToTarget) 
        : null;
      
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">
            Cestello #{basket.physicalNumber} 
            {targetSize && ` - Taglia ${targetSize.code} (${targetSize.name})`}
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Taglia attuale:</div>
            <div>{currentSize?.code} - {currentSize?.name || 'N/A'}</div>
            
            <div className="text-gray-500">Peso attuale:</div>
            <div>{Math.round(currentWeight)} mg</div>
            
            {currentSize?.code === targetSizeCode ? (
              <div className="col-span-2 mt-1 text-green-600 font-medium">
                Ha già raggiunto la taglia target!
              </div>
            ) : daysToTarget === null ? (
              <div className="col-span-2 mt-1 text-red-600 font-medium">
                Non raggiungerà la taglia target entro 365 giorni.
              </div>
            ) : (
              <>
                <div className="text-gray-500">Giorni necessari:</div>
                <div className="font-medium">{daysToTarget} giorni</div>
                
                {targetDate && (
                  <>
                    <div className="text-gray-500">Data prevista:</div>
                    <div className="font-medium">{format(targetDate, 'dd/MM/yyyy')}</div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-3 rounded border-2 ${colorClass} ${height} ${width} flex flex-col justify-between cursor-pointer relative overflow-hidden`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    C#{cycle.id}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col w-full items-center justify-center space-y-1">
                {currentSize?.code === targetSizeCode ? (
                  <div className="flex items-center justify-center text-[10px] font-medium text-green-600">
                    Taglia raggiunta
                  </div>
                ) : daysToTarget === null ? (
                  <div className="flex items-center justify-center text-[10px] font-medium text-red-600">
                    Non raggiungibile
                  </div>
                ) : (
                  <>
                    <div className="flex items-center text-[10px]">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysToTarget} giorni
                    </div>
                    <div className="flex items-center text-[9px] text-gray-500 whitespace-nowrap max-w-full overflow-hidden">
                      {/* Gestione speciale per taglie TP-10000+ con visualizzazione speciale */}
                      {currentSize?.code && currentSize.code.startsWith('TP-') && parseInt(currentSize.code.replace('TP-', '')) >= 10000 ? (
                        <>+TP-10000</>
                      ) : (
                        <>{currentSize?.code || '?'}</>
                      )}
                      <ArrowRight className="h-3 w-3 mx-0.5 flex-shrink-0" /> 
                      {targetSizeCode}
                    </div>
                  </>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            {tooltipContent()}
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render principale del componente
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>Confronto Flupsy</div>
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 px-2" 
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-7 px-2" 
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 1))}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2"
                onClick={() => {
                  // Forza il re-render dei dati
                  location.reload();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Visualizza lo stato attuale e futuro dei flupsy e delle cestine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-start md:space-x-4 space-y-4 md:space-y-0">
            <div className="w-full md:w-56 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Seleziona Flupsy
                </label>
                <Select
                  value={selectedFlupsyId?.toString() || ''}
                  onValueChange={(value) => setSelectedFlupsyId(parseInt(value))}
                  disabled={isLoadingFlupsys}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona un Flupsy" />
                  </SelectTrigger>
                  <SelectContent>
                    {flupsys?.map((flupsy) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Tabs value={currentTabId} onValueChange={setCurrentTabId} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="data-futuro">Data futura</TabsTrigger>
                  <TabsTrigger value="taglia-target">Taglia target</TabsTrigger>
                </TabsList>
                
                <TabsContent value="data-futuro" className="space-y-4 mt-4">
                  <div>
                    <label className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-500">Giorni nel futuro</span>
                      <span className="text-gray-500">{daysInFuture} giorni ({Math.round(daysInFuture/30 * 10) / 10} mesi)</span>
                    </label>
                    <Slider
                      value={[daysInFuture]}
                      min={5}
                      max={180}
                      step={5}
                      onValueChange={(value) => setDaysInFuture(value[0])}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5 giorni</span>
                      <span>180 giorni (6 mesi)</span>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="taglia-target" className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Taglia target
                    </label>
                    <Select
                      value={targetSizeCode}
                      onValueChange={setTargetSizeCode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona taglia target" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes?.map((size) => (
                          <SelectItem key={size.id} value={size.code}>
                            {size.code} - {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Informazioni sul flupsy selezionato */}
              {selectedFlupsy && (
                <Card className="mt-4">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base">{selectedFlupsy.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 pb-4">
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                        <div className="text-gray-500">Località:</div>
                        <div>{selectedFlupsy.location || 'N/A'}</div>
                        <div className="text-gray-500">Cestelli:</div>
                        <div>{fluspyBaskets.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Dettagli SGR per debug */}
              {process.env.NODE_ENV === 'development' && (
                <Card className="mt-4">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-base">Debug SGR</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 pb-4">
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        {sgrs?.map((sgr) => (
                          <React.Fragment key={sgr.id}>
                            <div>{sgr.month}:</div>
                            <div>{sgr.percentage}% (giornaliero)</div>
                            <div>Mensile (~30gg):</div>
                            <div>{((Math.pow(1 + sgr.percentage/100, 30) - 1) * 100).toFixed(2)}%</div>
                            <div className="col-span-2 border-t border-gray-200 mt-1 pt-1"></div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <div className="flex-1">
              {isLoadingBaskets ? (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  Caricamento in corso...
                </div>
              ) : fluspyBaskets.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-gray-400">
                  Nessun cestello trovato per questo flupsy
                </div>
              ) : (
                <div>
                  {/* Mostra dettagli sul turno di visualizzazione */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">
                        {currentTabId === 'data-futuro' ? 
                          `Visualizzazione a ${daysInFuture} giorni (${format(addDays(new Date(), daysInFuture), 'dd/MM/yyyy')})` :
                          `Visualizzazione crescita fino a taglia ${targetSizeCode}`
                        }
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <HighContrastTooltip>
                            {currentTabId === 'data-futuro' ?
                              'Questa visualizzazione mostra come sarà il flupsy nella data futura specificata.' :
                              'Questa visualizzazione indica quali cestelli raggiungeranno la taglia target e in quanto tempo.'
                            }
                          </HighContrastTooltip>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  
                  {/* Estrai le righe (es. SX, DX) disponibili */}
                  {(() => {
                    // Converti i cestelli in una matrice per riga/posizione
                    const rows = [...new Set(fluspyBaskets.map(b => b.row))].filter(Boolean).sort();
                    
                    // Calcola il numero massimo di posizioni tra tutte le righe
                    const maxPosition = Math.max(
                      ...fluspyBaskets.map(b => b.position || 0), 
                      8 // Minimo 8 posizioni per visualizzazione
                    );
                    
                    // Crea una matrice di cestelli
                    const basketMatrix = {};
                    rows.forEach(row => {
                      basketMatrix[row] = Array(maxPosition).fill(null);
                    });
                    
                    // Riempi la matrice con i cestelli
                    fluspyBaskets.forEach(basket => {
                      if (basket.row && basket.position !== null) {
                        basketMatrix[basket.row][basket.position - 1] = basket;
                      }
                    });
                    
                    return (
                      <div className="space-y-6">
                        {rows.map(row => (
                          <div key={row} className="rounded-md">
                            <div className="flex items-center mb-2">
                              <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                Fila {row}
                              </div>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                              {basketMatrix[row].map((basket, position) => (
                                <div key={position} className="flex items-center justify-center">
                                  {currentTabId === 'data-futuro' ? 
                                    renderFutureBasket(basket) : 
                                    renderTargetSizeBasket(basket)
                                  }
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Cestelli senza posizione */}
                        {fluspyBaskets.filter(b => !b.row || b.position === null).length > 0 && (
                          <div className="rounded-md">
                            <div className="flex items-center mb-2">
                              <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                Cestelli senza posizione
                              </div>
                            </div>
                            <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                              {fluspyBaskets
                                .filter(b => !b.row || b.position === null)
                                .map(basket => (
                                  <div key={basket.id} className="flex items-center justify-center">
                                    {currentTabId === 'data-futuro' ? 
                                      renderFutureBasket(basket) : 
                                      renderTargetSizeBasket(basket)
                                    }
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}