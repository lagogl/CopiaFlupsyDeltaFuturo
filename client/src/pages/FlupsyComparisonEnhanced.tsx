import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { format, addDays, differenceInWeeks } from 'date-fns';
import { Calendar, Clock, ArrowRight, Info, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { getTargetSizeForWeight, getFutureWeightAtDate, getSizeColor, monthlyToDaily } from '@/lib/utils';
import SizeGrowthTimeline from '@/components/SizeGrowthTimeline';

// Componente personalizzato per il tooltip che garantisce alta leggibilità
const HighContrastTooltip = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <TooltipContent className={`bg-white text-gray-900 border-2 border-gray-300 shadow-md ${className}`}>
    {children}
  </TooltipContent>
);

// Helper function per ottenere il colore di una taglia
const getSizeColorWithBorder = (sizeCode: string): string => {
  // Funzione locale che restituisce colori con contrasto adeguato per la visualizzazione
  
  // Verifica se il codice della taglia è TP-10000 o superiore
  if (sizeCode.startsWith('TP-') && parseInt(sizeCode.replace('TP-', '')) >= 10000) {
    return 'bg-black text-white border-gray-800';
  }
  
  // Per le altre taglie TP, determina il colore in base al numero
  if (sizeCode.startsWith('TP-')) {
    // Estrai il numero dalla taglia
    const sizeNum = parseInt(sizeCode.replace('TP-', ''));
    
    if (sizeNum <= 500) {
      return 'bg-purple-500 text-white border-purple-700'; // TP-500 e inferiori
    } else if (sizeNum <= 1000) {
      return 'bg-pink-500 text-white border-pink-700';     // TP-1000 e similari
    } else if (sizeNum <= 2000) {  
      return 'bg-rose-500 text-white border-rose-700';     // TP-2000 e similari
    } else if (sizeNum <= 3000) {
      return 'bg-red-500 text-white border-red-700';       // TP-3000 e similari
    } else if (sizeNum <= 4000) {
      return 'bg-orange-500 text-white border-orange-700'; // TP-4000 e similari
    } else if (sizeNum <= 6000) {
      return 'bg-amber-500 text-white border-amber-700';   // TP-5000/6000
    } else if (sizeNum <= 7000) {
      return 'bg-lime-500 text-white border-lime-700';     // TP-7000
    } else if (sizeNum <= 8000) {
      return 'bg-green-500 text-white border-green-700';   // TP-8000
    } else if (sizeNum <= 9000) {
      return 'bg-teal-500 text-white border-teal-700';     // TP-9000
    }
  }
  
  // Default per taglie non riconosciute
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

// Questo componente visualizza il confronto tra lo stato attuale e futuro del FLUPSY
export default function FlupsyComparison() {
  // State per il FLUPSY selezionato
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  
  // State per modalità di confronto e data target
  const [comparisonType, setComparisonType] = useState<'date' | 'target-size'>('date');
  const [targetDate, setTargetDate] = useState<Date>(addDays(new Date(), 30));
  const [targetSize, setTargetSize] = useState<string>('TP-3000');
  
  // State per lo zoom delle ceste
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Dati dal server
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: baskets } = useQuery({
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
    
    // Ottieni la percentuale SGR giornaliera (percentage è già la crescita giornaliera)
    let sgrDailyPercentage = 1.0; // Valore di default (1% al giorno)
    if (sgrs && sgrs.length > 0) {
      // Usa il valore SGR del mese corrente se disponibile
      const currentMonth = format(new Date(), 'MMMM').toLowerCase();
      const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
      if (currentSgr) {
        sgrDailyPercentage = currentSgr.percentage; // Diretta, già valore giornaliero
      } else {
        // Altrimenti usa il valore medio delle percentuali giornaliere
        sgrDailyPercentage = sgrs.reduce((acc, sgr) => acc + sgr.percentage, 0) / sgrs.length;
      }
    }
    
    // Calcolo del peso futuro usando i valori SGR giornalieri mese per mese
    let simulationWeight = currentWeight;
    let simulationDate = new Date(measurementDate);
    
    for (let i = 0; i < daysToAdd; i++) {
      // Determina il mese corrente per usare il tasso SGR appropriato
      const month = format(simulationDate, 'MMMM').toLowerCase();
      
      // Trova il tasso SGR per questo mese
      let dailyRate = sgrDailyPercentage;
      if (sgrs) {
        const monthSgr = sgrs.find(sgr => sgr.month.toLowerCase() === month);
        if (monthSgr) {
          dailyRate = monthSgr.percentage; // Valori già giornalieri
        }
      }
      
      // Applica la crescita giornaliera
      simulationWeight = simulationWeight * (1 + dailyRate / 100);
      simulationDate = addDays(simulationDate, 1);
    }
    
    return Math.round(simulationWeight);
  };
  
  // Calcola il numero di giorni necessari per raggiungere una taglia target
  const calculateDaysToReachSize = (basketId: number, targetSize: string) => {
    const latestOperation = getLatestOperationForBasket(basketId);
    if (!latestOperation || latestOperation.animalsPerKg === null) return null;
    
    // Calcola il peso attuale in mg
    const currentWeight = latestOperation.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : 0;
    
    if (!sizes) return null;
    const targetSizeObj = sizes ? sizes.find(s => s.code === targetSize) : null;
    if (!targetSizeObj) return null;
    
    // Calcola il peso target in mg (utilizziamo il valore minimo per la taglia)
    const targetWeight = targetSizeObj.minAnimalsPerKg ? 1000000 / targetSizeObj.minAnimalsPerKg : 0;
    
    // Se il peso corrente è già maggiore del peso target, è già nella taglia target
    if (currentWeight >= targetWeight) return 0;
    
    // Ottieni la percentuale SGR giornaliera
    let sgrDailyPercentage = 1.0; // Valore di default (1% al giorno)
    if (sgrs && sgrs.length > 0) {
      // Usa il valore SGR del mese corrente se disponibile
      const currentMonth = format(new Date(), 'MMMM').toLowerCase();
      const currentSgr = sgrs.find(sgr => sgr.month.toLowerCase() === currentMonth);
      if (currentSgr) {
        sgrDailyPercentage = currentSgr.percentage; // Diretta, già valore giornaliero
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
          // Converte il valore mensile in giornaliero
          dailyRate = monthlyToDaily(monthSgr.percentage);
        }
      }
      
      // Applica la crescita giornaliera
      simulationWeight = simulationWeight * (1 + dailyRate / 100);
      days++;
      currentDate = addDays(currentDate, 1);
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

  // Funzione per determinare la dimensione della card in base allo zoom
  const getBasketCardStyle = () => {
    if (!zoomEnabled) {
      return { width: '10rem', height: '4rem' }; // Dimensione standard
    }
    
    const width = 10 + (zoomLevel * 2); // Incremento larghezza in base allo zoom
    const height = 4 + (zoomLevel * 0.5); // Incremento altezza in base allo zoom
    
    return {
      width: `${width}rem`,
      height: `${height}rem`,
      zIndex: zoomLevel > 1 ? 10 : 'auto'
    };
  };

  // Renderizza un cestello per la visualizzazione attuale
  const renderCurrentBasket = (basket: any) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="basket-card p-2 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer transition-all duration-200"
              style={getBasketCardStyle()}
            >
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
              className={`basket-card p-2 rounded border-2 ${colorClass} flex flex-col justify-between cursor-pointer transition-all duration-200`}
              style={getBasketCardStyle()}
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
                <div className="flex justify-between items-center w-full">
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500 text-white">
                    {currentSize.code}
                  </Badge>
                  <div className="text-[9px] font-medium">{currentWeight} mg</div>
                </div>
              )}
              
              {latestOperation && (
                <div className="mt-auto text-[9px] flex justify-between items-center w-full">
                  <div>{format(new Date(latestOperation.date), 'dd/MM')}</div>
                  <div className="opacity-75 font-medium">{latestOperation.type}</div>
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

  // Renderizza un cestello per la visualizzazione futura (per data)
  const renderFutureBasketByDate = (basket: any) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="basket-card p-2 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer transition-all duration-200"
              style={getBasketCardStyle()}
            >
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
    
    if (!latestOperation || !cycle) {
      return renderCurrentBasket(basket); // Se non ci sono dati, mostra lo stato attuale
    }
    
    // Calcola il peso attuale e futuro
    const currentWeight = latestOperation.animalsPerKg 
      ? Math.round(1000000 / latestOperation.animalsPerKg) 
      : null;
    
    if (!currentWeight) return renderCurrentBasket(basket);
    
    // Calcola i giorni tra la data attuale e la data target
    const measurementDate = new Date(latestOperation.date);
    const daysDiff = Math.max(0, Math.round((targetDate.getTime() - measurementDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calcola il peso futuro
    const futureWeight = calculateFutureWeight(basket.id, daysDiff);
    if (!futureWeight) return renderCurrentBasket(basket);
    
    // Determina la taglia futura
    const futureSize = getTargetSizeForWeight(futureWeight, sizes);
    
    // Classe CSS per il colore del cestello futuro
    const colorClass = futureSize?.code 
      ? getSizeColorWithBorder(futureSize.code) 
      : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Calcola la percentuale di crescita
    const growthPercentage = currentWeight 
      ? Math.round((futureWeight - currentWeight) / currentWeight * 100) 
      : 0;
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber} - Previsione</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Data misurazione:</div>
            <div>{format(measurementDate, 'dd/MM/yyyy')}</div>
            <div className="text-gray-500">Data previsione:</div>
            <div>{format(targetDate, 'dd/MM/yyyy')}</div>
            <div className="text-gray-500">Peso attuale:</div>
            <div>{currentWeight} mg</div>
            <div className="text-gray-500">Peso previsto:</div>
            <div>{futureWeight} mg</div>
            <div className="text-gray-500">Crescita:</div>
            <div>+{growthPercentage}%</div>
            <div className="text-gray-500">Taglia attuale:</div>
            <div>{getTargetSizeForWeight(currentWeight, sizes)?.code || 'N/A'}</div>
            <div className="text-gray-500">Taglia prevista:</div>
            <div>{futureSize?.code || 'N/A'}</div>
          </div>
        </div>
      );
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-2 rounded border-2 ${colorClass} flex flex-col justify-between cursor-pointer transition-all duration-200`}
              style={getBasketCardStyle()}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-blue-500/20">
                  +{daysDiff}d
                </Badge>
              </div>
              
              {futureSize && (
                <div className="flex justify-between items-center w-full">
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-green-500 text-white">
                    {futureSize.code}
                  </Badge>
                  <div className="text-[9px] font-medium">{futureWeight} mg</div>
                </div>
              )}
              
              <div className="mt-auto text-[9px] flex justify-between items-center w-full">
                <Badge variant="outline" className="px-1 py-0 h-4 text-[8px] bg-blue-500/10">
                  +{growthPercentage}%
                </Badge>
                <div className="text-[8px] opacity-75">
                  {format(targetDate, 'dd/MM/yyyy')}
                </div>
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

  // Renderizza un cestello per la visualizzazione futura (per taglia target)
  const renderFutureBasketBySize = (basket: any) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="basket-card p-2 rounded border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer transition-all duration-200"
              style={getBasketCardStyle()}
            >
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
    
    if (!latestOperation || !cycle) {
      return renderCurrentBasket(basket); // Se non ci sono dati, mostra lo stato attuale
    }
    
    // Calcola il peso attuale
    const currentWeight = latestOperation.animalsPerKg 
      ? Math.round(1000000 / latestOperation.animalsPerKg) 
      : null;
    
    if (!currentWeight) return renderCurrentBasket(basket);
    
    // Calcola i giorni necessari per raggiungere la taglia target
    const daysToReach = calculateDaysToReachSize(basket.id, targetSize);
    
    // Se è già nella taglia target o superiore, o se non abbiamo una stima valida
    if (daysToReach === 0) {
      // Già nella taglia target
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`basket-card p-2 rounded border-2 ${getSizeColorWithBorder(targetSize)} flex flex-col justify-between cursor-pointer transition-all duration-200`}
                style={getBasketCardStyle()}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-green-500/20">
                    Raggiunta
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center w-full">
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-green-500 text-white">
                    {targetSize}
                  </Badge>
                  <div className="text-[9px] font-medium">{currentWeight} mg</div>
                </div>
                
                <div className="mt-auto text-[9px] flex justify-between items-center w-full">
                  <Badge variant="outline" className="px-1 py-0 h-4 text-[8px] bg-green-500/10">
                    OK
                  </Badge>
                  <div className="text-[8px] opacity-75">
                    Già raggiunta
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <HighContrastTooltip>
              <div className="p-2 max-w-xs">
                <div className="font-bold mb-1">Cestello #{basket.physicalNumber} - Taglia Target</div>
                <div className="text-sm text-gray-800 mb-2">
                  Questo cestello ha già raggiunto o superato la taglia target {targetSize}.
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <div className="text-gray-500">Peso attuale:</div>
                  <div>{currentWeight} mg</div>
                  <div className="text-gray-500">Taglia attuale:</div>
                  <div>{getTargetSizeForWeight(currentWeight, sizes)?.code || 'N/A'}</div>
                  <div className="text-gray-500">Taglia target:</div>
                  <div>{targetSize}</div>
                </div>
              </div>
            </HighContrastTooltip>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Non raggiungibile (null) o giorni troppo elevati (>365)
    const willReach = daysToReach !== null && daysToReach < 365;
    
    // Se non raggiungerà la taglia target in tempo ragionevole
    if (!willReach) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`basket-card p-2 rounded border-2 ${getSizeColorWithBorder('default')} flex flex-col justify-between opacity-40 cursor-pointer transition-all duration-200`}
                style={getBasketCardStyle()}
              >
                <div className="flex justify-between items-start w-full">
                  <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-red-500/20">
                    Non prevista
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center w-full">
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-gray-400 text-white">
                    {getTargetSizeForWeight(currentWeight, sizes)?.code || 'N/A'}
                  </Badge>
                  <div className="text-[9px] font-medium">{currentWeight} mg</div>
                </div>
                
                <div className="mt-auto text-[9px] flex justify-between items-center w-full">
                  <Badge variant="outline" className="px-1 py-0 h-4 text-[8px] bg-red-500/10">
                    N/D
                  </Badge>
                  <div className="text-[8px] opacity-75">
                    &gt;1 anno
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <HighContrastTooltip>
              <div className="p-2 max-w-xs">
                <div className="font-bold mb-1">Cestello #{basket.physicalNumber} - Taglia Target</div>
                <div className="text-sm text-red-600 mb-2">
                  Questo cestello non raggiungerà la taglia target {targetSize} in un periodo ragionevole (entro 1 anno).
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                  <div className="text-gray-500">Peso attuale:</div>
                  <div>{currentWeight} mg</div>
                  <div className="text-gray-500">Taglia attuale:</div>
                  <div>{getTargetSizeForWeight(currentWeight, sizes)?.code || 'N/A'}</div>
                  <div className="text-gray-500">Taglia target:</div>
                  <div>{targetSize}</div>
                </div>
              </div>
            </HighContrastTooltip>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Calcola la data prevista
    const targetDate = addDays(new Date(latestOperation.date), daysToReach);
    
    // Calcola il peso previsto quando raggiungerà la taglia target
    const targetSizeObj = sizes?.find(s => s.code === targetSize);
    const targetWeight = targetSizeObj?.minAnimalsPerKg ? 1000000 / targetSizeObj.minAnimalsPerKg : 0;
    
    // Calcola la percentuale di crescita
    const growthPercentage = currentWeight && targetWeight
      ? Math.round((targetWeight - currentWeight) / currentWeight * 100) 
      : 0;
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber} - Taglia Target</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Taglia target:</div>
            <div>{targetSize}</div>
            <div className="text-gray-500">Data raggiungimento:</div>
            <div>{format(targetDate, 'dd/MM/yyyy')}</div>
            <div className="text-gray-500">Giorni necessari:</div>
            <div>{daysToReach}</div>
            <div className="text-gray-500">Peso attuale:</div>
            <div>{currentWeight} mg</div>
            <div className="text-gray-500">Peso target:</div>
            <div>{Math.round(targetWeight)} mg</div>
            <div className="text-gray-500">Crescita:</div>
            <div>+{growthPercentage}%</div>
          </div>
        </div>
      );
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-2 rounded border-2 ${getSizeColorWithBorder(targetSize)} flex flex-col justify-between cursor-pointer transition-all duration-200`}
              style={getBasketCardStyle()}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                  {daysToReach}d
                </Badge>
              </div>
              
              <div className="flex justify-between items-center w-full">
                <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500 text-white">
                  {targetSize}
                </Badge>
                <div className="text-[9px] font-medium">{Math.round(targetWeight)} mg</div>
              </div>
              
              <div className="mt-auto text-[9px] flex justify-between items-center w-full">
                <Badge variant="outline" className="px-1 py-0 h-4 text-[8px] bg-blue-500/10">
                  +{growthPercentage}%
                </Badge>
                <div className="text-[8px] opacity-75">
                  {format(targetDate, 'dd/MM')}
                </div>
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

  // Formatta i giorni in testo leggibile
  const formatDaysRange = (days: number) => {
    if (days <= 7) return `${days} giorni`;
    if (days <= 30) return `${Math.round(days / 7)} settimane`;
    if (days <= 365) return `${Math.round(days / 30)} mesi`;
    return `${(days / 365).toFixed(1)} anni`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Confronto FLUPSY: Attuale vs Futuro</h1>
        <p className="text-gray-500">
          Confronta lo stato attuale con lo stato futuro delle ceste in base alla crescita prevista
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pannello di selezione */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Selezione Unità FLUPSY</CardTitle>
            <CardDescription>
              Seleziona l'unità FLUPSY da visualizzare
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedFlupsyId?.toString()} 
              onValueChange={(value) => setSelectedFlupsyId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona FLUPSY" />
              </SelectTrigger>
              <SelectContent>
                {flupsys && flupsys.map(flupsy => (
                  <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                    {flupsy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        {/* Pannello di selezione tipo confronto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Tipo di confronto</CardTitle>
            <CardDescription>
              Scegli il tipo di confronto e i relativi parametri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              defaultValue="date" 
              value={comparisonType}
              onValueChange={(value) => setComparisonType(value as 'date' | 'target-size')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="date" className="flex items-center justify-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Data futura
                </TabsTrigger>
                <TabsTrigger value="target-size" className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Taglia target
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="date" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Proiezione a <span className="font-bold">{formatDaysRange(differenceInWeeks(targetDate, new Date()) * 7)}</span>
                    </label>
                    <Slider 
                      defaultValue={[30]} 
                      max={180}
                      min={7}
                      step={1}
                      value={[differenceInWeeks(targetDate, new Date()) * 7]}
                      onValueChange={([days]) => setTargetDate(addDays(new Date(), days))}
                      className="py-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {format(targetDate, 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="target-size" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Taglia target
                    </label>
                    <Select 
                      value={targetSize} 
                      onValueChange={setTargetSize}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona taglia" />
                      </SelectTrigger>
                      <SelectContent>
                        {sizes && sizes.map(size => (
                          <SelectItem key={size.id} value={size.code}>
                            {size.code} - {size.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Controlli zoom */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="zoom-switch"
            checked={zoomEnabled}
            onCheckedChange={setZoomEnabled}
          />
          <Label htmlFor="zoom-switch" className="cursor-pointer">
            Zoom ceste
          </Label>
        </div>
        
        {zoomEnabled && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                disabled={zoomLevel <= 1}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-16 text-center">
                {zoomLevel.toFixed(1)}x
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                disabled={zoomLevel >= 4}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(1)}
              className="text-xs"
            >
              <Minimize2 className="h-3 w-3 mr-1" />
              Reset
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(4)}
              className="text-xs"
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Max
            </Button>
          </div>
        )}
      </div>
      
      {/* Visualizzazione FLUPSY */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Stato attuale */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Stato attuale</CardTitle>
            <CardDescription>
              Visualizzazione corrente del FLUPSY {selectedFlupsy?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Riga DX e SX del FLUPSY */}
            <div className="space-y-8">
              {/* Riga SX */}
              <div>
                <div className="flex items-center mb-2">
                  <Badge variant="secondary" className="mr-2">Riga SX</Badge>
                  <Separator className="flex-grow" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                    <div key={`SX-${position}`}>
                      {renderCurrentBasket(fluspyBaskets?.find(b => b.row === 'SX' && b.position === position))}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Riga DX */}
              <div>
                <div className="flex items-center mb-2">
                  <Badge variant="secondary" className="mr-2">Riga DX</Badge>
                  <Separator className="flex-grow" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                    <div key={`DX-${position}`}>
                      {renderCurrentBasket(fluspyBaskets?.find(b => b.row === 'DX' && b.position === position))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Stato futuro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>
              Stato futuro {comparisonType === 'date' 
                ? `(${format(targetDate, 'dd/MM/yyyy')})` 
                : `(Taglia ${targetSize})`
              }
            </CardTitle>
            <CardDescription>
              {comparisonType === 'date' 
                ? `Previsione a ${formatDaysRange(differenceInWeeks(targetDate, new Date()) * 7)} da oggi` 
                : `Previsione del tempo necessario per raggiungere la taglia ${targetSize}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Riga DX e SX del FLUPSY (futuro) */}
            <div className="space-y-8">
              {/* Riga SX */}
              <div>
                <div className="flex items-center mb-2">
                  <Badge variant="secondary" className="mr-2">Riga SX</Badge>
                  <Separator className="flex-grow" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                    <div key={`SX-future-${position}`}>
                      {comparisonType === 'date' 
                        ? renderFutureBasketByDate(fluspyBaskets?.find(b => b.row === 'SX' && b.position === position))
                        : renderFutureBasketBySize(fluspyBaskets?.find(b => b.row === 'SX' && b.position === position))
                      }
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Riga DX */}
              <div>
                <div className="flex items-center mb-2">
                  <Badge variant="secondary" className="mr-2">Riga DX</Badge>
                  <Separator className="flex-grow" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                    <div key={`DX-future-${position}`}>
                      {comparisonType === 'date' 
                        ? renderFutureBasketByDate(fluspyBaskets?.find(b => b.row === 'DX' && b.position === position))
                        : renderFutureBasketBySize(fluspyBaskets?.find(b => b.row === 'DX' && b.position === position))
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {sizes && sizes.map(size => (
              <div key={size.id} className="flex items-center">
                <div className={`w-4 h-4 rounded-sm mr-2 ${getSizeColor(size.code)}`}></div>
                <div className="text-sm">
                  {size.code} ({size.minAnimalsPerKg}-{size.maxAnimalsPerKg})
                </div>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2">+30d</Badge>
              <div className="text-sm">Giorni previsti</div>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="bg-green-500/10 mr-2">+10%</Badge>
              <div className="text-sm">Crescita prevista</div>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="bg-blue-500/10 mr-2">OK</Badge>
              <div className="text-sm">Già nella taglia target</div>
            </div>
            <div className="flex items-center">
              <Badge variant="outline" className="bg-red-500/10 mr-2">N/D</Badge>
              <div className="text-sm">Non raggiungibile in periodo ragionevole</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}