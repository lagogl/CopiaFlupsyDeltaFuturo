import { useState, useMemo } from 'react';

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  [key: string]: any; // per eventuali altre proprietà
}

interface Flupsy {
  id: number;
  name: string;
  location: string;
  [key: string]: any; // per eventuali altre proprietà
}

interface Operation {
  id: number;
  basketId: number;
  cycleId: number | null;
  date: string;
  type: string;
  animalsPerKg: number | null;
  averageWeight: number | null;
  sizeId: number | null;
  [key: string]: any; // per eventuali altre proprietà
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: 'active' | 'closed';
  [key: string]: any; // per eventuali altre proprietà
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
  color?: string;
  [key: string]: any; // per eventuali altre proprietà
}

interface Sgr {
  id: number;
  month: string;
  percentage: number;
  [key: string]: any; // per eventuali altre proprietà
}

interface TimelineItem {
  size: string;
  name: string;
  days: number | null;
  date: Date | null;
  color: string;
}
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HighContrastTooltip } from "@/components/ui/high-contrast-tooltip";
import { format, addDays, differenceInWeeks } from 'date-fns';
import { Calendar, Clock, ArrowRight, Info, Loader2 } from 'lucide-react';
import { getTargetSizeForWeight, getFutureWeightAtDate, getSizeColor } from '@/lib/utils';

// Helper function per ottenere il colore di una taglia
const getSizeColorWithBorder = (sizeCode: string): string => {
  // Funzione locale che restituisce colori con contrasto adeguato per la visualizzazione
  switch (sizeCode) {
    case 'T1':
      return 'bg-blue-500 text-white border-blue-700';
    case 'T2':
      return 'bg-cyan-500 text-white border-cyan-700';
    case 'T3':
      return 'bg-teal-500 text-white border-teal-700';
    case 'T4':
      return 'bg-green-500 text-white border-green-700';
    case 'T5':
      return 'bg-lime-500 text-white border-lime-700';
    case 'T6':
      return 'bg-amber-500 text-white border-amber-700';
    case 'T7':
      return 'bg-orange-500 text-white border-orange-700';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Questo componente visualizza il confronto tra lo stato attuale e futuro del FLUPSY
export default function FlupsyComparison() {
  // Stati per le impostazioni di visualizzazione
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [currentTabId, setCurrentTabId] = useState<string>("data-futuro");
  const [daysInFuture, setDaysInFuture] = useState<number>(30);
  const [targetSizeCode, setTargetSizeCode] = useState<string>("T5");

  // Fetch dei dati necessari
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  const { data: operations } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });
  
  const { data: cycles } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });

  const { data: sizes } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });

  const { data: sgrs } = useQuery<Sgr[]>({
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
    
    // Calcola il peso futuro usando direttamente la percentuale giornaliera
    const targetDate = addDays(new Date(), daysToAdd);
    
    // Calcolo manuale del peso futuro
    const days = Math.floor((targetDate.getTime() - measurementDate.getTime()) / (1000 * 60 * 60 * 24));
    let simulatedWeight = currentWeight;
    
    for (let i = 0; i < days; i++) {
      // Per ogni giorno, calcoliamo il mese corrispondente per usare il tasso SGR appropriato
      const currentDate = addDays(measurementDate, i);
      const month = format(currentDate, 'MMMM').toLowerCase();
      
      // Trova il tasso SGR per questo mese
      let dailyRate = sgrDailyPercentage;
      if (sgrs) {
        const monthSgr = sgrs.find(sgr => sgr.month.toLowerCase() === month);
        if (monthSgr) {
          dailyRate = monthSgr.percentage; // Diretta, è già il valore giornaliero
        }
      }
      
      // Applica la crescita giornaliera
      simulatedWeight = simulatedWeight * (1 + dailyRate / 100);
    }
    
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
          dailyRate = monthSgr.percentage; // Diretta, è già il valore giornaliero
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

  // Renderizza un cestello per la visualizzazione attuale
  const renderCurrentBasket = (basket: Basket | null) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="basket-card p-2 rounded border-2 border-dashed border-gray-300 h-20 w-48 flex items-center justify-center text-gray-400 text-xs cursor-pointer">
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
              className={`basket-card p-2 rounded border-2 ${colorClass} h-16 w-40 flex flex-col justify-between cursor-pointer`}
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
  const renderFutureBasketByDate = (basket: Basket | null) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="basket-card p-2 rounded border-2 border-dashed border-gray-300 h-16 w-40 flex items-center justify-center text-gray-400 text-xs cursor-pointer">
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
    
    // Calcola il peso futuro
    const futureWeight = currentWeight 
      ? calculateFutureWeight(basket.id, daysInFuture) 
      : null;
    
    // Determina la taglia futura
    const futureSize = futureWeight 
      ? getTargetSizeForWeight(futureWeight, sizes) 
      : null;
    
    // Classe CSS per il colore del cestello futuro
    const colorClass = futureSize?.code 
      ? getSizeColorWithBorder(futureSize.code) 
      : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Calcola la percentuale di crescita
    const growthPercentage = currentWeight && futureWeight 
      ? Math.round((futureWeight - currentWeight) / currentWeight * 100) 
      : null;
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const currentSize = currentWeight ? getTargetSizeForWeight(currentWeight, sizes) : null;
      const futureDate = addDays(new Date(), daysInFuture);
      
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Peso attuale:</div>
            <div>{currentWeight} mg ({currentSize?.code || 'N/A'})</div>
            <div className="text-gray-500">Peso futuro:</div>
            <div>{futureWeight} mg ({futureSize?.code || 'N/A'})</div>
            {growthPercentage !== null && (
              <>
                <div className="text-gray-500">Crescita:</div>
                <div className={growthPercentage > 20 ? "text-green-600 font-medium" : ""}>+{growthPercentage}%</div>
              </>
            )}
            <div className="text-gray-500">Data futura:</div>
            <div>{format(futureDate, 'dd/MM/yyyy')}</div>
            <div className="text-gray-500">Giorni previsti:</div>
            <div>{daysInFuture}</div>
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
              className={`basket-card p-2 rounded border-2 ${colorClass} h-16 w-40 flex flex-col justify-between cursor-pointer`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    C#{cycle.id}
                  </Badge>
                )}
              </div>
              
              {futureSize && (
                <div className="flex justify-between items-center w-full">
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500 text-white">
                    {futureSize.code}
                  </Badge>
                  <div className="text-[9px] font-medium">{futureWeight} mg</div>
                </div>
              )}
              
              {growthPercentage !== null && (
                <div className="mt-auto flex justify-between items-center w-full">
                  <Badge className={`text-[8px] px-1.5 py-0 h-4 ${growthPercentage > 20 ? "bg-green-500 text-white" : "bg-gray-200"}`}>
                    +{growthPercentage}%
                  </Badge>
                  <div className="opacity-75 text-[9px] font-medium">
                    {format(addDays(new Date(), daysInFuture), 'dd/MM')}
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

  // Renderizza un cestello per la visualizzazione futura (per taglia target)
  const renderFutureBasketBySize = (basket: Basket | null) => {
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="basket-card p-2 rounded border-2 border-dashed border-gray-300 h-16 w-40 flex items-center justify-center text-gray-400 text-xs cursor-pointer">
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
    
    // Calcola i giorni necessari per raggiungere la taglia target
    const daysToReach = getDaysToReachTargetSize(basket.id, targetSizeCode);
    
    // Determina se raggiungerà la taglia target
    const willReach = willReachTargetSize(basket.id, targetSizeCode);
    
    // Ottieni l'oggetto taglia target
    const targetSizeObj = sizes ? sizes.find(s => s.code === targetSizeCode) : null;
    
    // Classe CSS per il colore del cestello
    let colorClass = 'bg-gray-100 text-gray-800 border-gray-300';
    if (currentSize?.code === targetSizeCode) {
      // È già nella taglia target
      colorClass = getSizeColorWithBorder(targetSizeCode);
    } else if (willReach) {
      // Raggiungerà la taglia target (colore più tenue)
      colorClass = getSizeColorWithBorder(targetSizeCode).replace('-500', '-400');
    }
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const reachStatus = currentSize?.code === targetSizeCode 
        ? "Già raggiunta" 
        : willReach 
          ? `Raggiungerà in ${daysToReach} giorni` 
          : "Non raggiungerà nel periodo";
      
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Taglia attuale:</div>
            <div>
              {currentSize?.code || 'N/A'} 
              ({currentWeight} mg)
            </div>
            <div className="text-gray-500">Taglia target:</div>
            <div className={currentSize?.code === targetSizeCode ? "text-green-600 font-medium" : ""}>
              {targetSizeCode} ({targetSizeObj?.name || 'N/A'})
            </div>
            <div className="text-gray-500">Stato:</div>
            <div className={willReach ? (currentSize?.code === targetSizeCode ? "text-green-600" : "text-blue-600") : "text-red-600"}>
              {reachStatus}
            </div>
            {daysToReach !== null && daysToReach > 0 && (
              <>
                <div className="text-gray-500">Data prevista:</div>
                <div>{format(addDays(new Date(), daysToReach), 'dd/MM/yyyy')}</div>
              </>
            )}
            {cycle && (
              <>
                <div className="text-gray-500">Ciclo:</div>
                <div>#{cycle.id} (dal {format(new Date(cycle.startDate), 'dd/MM/yyyy')})</div>
              </>
            )}
            {latestOperation && (
              <>
                <div className="text-gray-500">Ultima misurazione:</div>
                <div>{format(new Date(latestOperation.date), 'dd/MM/yyyy')}</div>
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
              className={`basket-card p-2 rounded border-2 ${colorClass} h-16 w-40 flex flex-col justify-between ${!willReach ? 'opacity-40' : ''} cursor-pointer`}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    C#{cycle.id}
                  </Badge>
                )}
              </div>
              
              <div className="flex justify-between items-center w-full">
                {currentSize?.code === targetSizeCode ? (
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-green-500 text-white">Già {targetSizeCode}</Badge>
                ) : willReach ? (
                  <Badge className="text-[8px] px-1.5 py-0 h-4 bg-blue-500 text-white">→{targetSizeCode}</Badge>
                ) : (
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">No</Badge>
                )}
                
                {daysToReach !== null && daysToReach > 0 && (
                  <div className="text-[9px] font-medium">
                    {daysToReach}g
                  </div>
                )}
              </div>
              
              {daysToReach !== null && daysToReach > 0 && (
                <div className="mt-auto flex justify-between items-center w-full">
                  <div className="opacity-75 text-[9px] font-medium">
                    {format(addDays(new Date(), daysToReach), 'dd/MM')}
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

  // Renderizza la griglia del FLUPSY
  const renderFlupsy = (renderBasketFn: (basket: Basket | null) => React.ReactNode) => {
    if (!selectedFlupsy || fluspyBaskets.length === 0) return null;
    
    // Trova il numero massimo di posizioni nella griglia
    const maxPositionSX = Math.max(...fluspyBaskets.filter(b => b.row === 'SX').map(b => b.position || 0));
    const maxPositionDX = Math.max(...fluspyBaskets.filter(b => b.row === 'DX').map(b => b.position || 0));
    const maxPosition = Math.max(maxPositionSX, maxPositionDX, 10); // Minimo 10 posizioni
    
    return (
      <div className="flupsy-visualizer">
        <div className="flupsy-grid flex justify-center gap-6">
          {/* Fila SX */}
          <div className="fila-sx">
            <div className="text-center mb-4">
              <h3 className="text-sm font-semibold">FILA SX</h3>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: maxPosition }).map((_, idx) => {
                const position = idx + 1;
                const basket = fluspyBaskets.find(b => b.row === 'SX' && b.position === position) || null;
                return (
                  <div key={`SX-${position}`} className="relative">
                    <div className="position-number absolute -left-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      {position}
                    </div>
                    {renderBasketFn(basket)}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Fila DX */}
          <div className="fila-dx">
            <div className="text-center mb-4">
              <h3 className="text-sm font-semibold">FILA DX</h3>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: maxPosition }).map((_, idx) => {
                const position = idx + 1;
                const basket = fluspyBaskets.find(b => b.row === 'DX' && b.position === position) || null;
                return (
                  <div key={`DX-${position}`} className="relative">
                    <div className="position-number absolute -left-5 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      {position}
                    </div>
                    {renderBasketFn(basket)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Confronto FLUPSY: Attuale vs Futuro</h1>
        <p className="text-muted-foreground">
          Confronta lo stato attuale con lo stato futuro delle vongole in base alla crescita prevista
        </p>
      </div>
      
      <div className="flex flex-col space-y-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Selezione FLUPSY */}
              <div className="w-full sm:w-64">
                <Label htmlFor="flupsy-select" className="mb-2 block font-medium">
                  Seleziona Unità FLUPSY
                </Label>
                <Select 
                  value={selectedFlupsyId?.toString() || ''} 
                  onValueChange={(value) => setSelectedFlupsyId(parseInt(value, 10))}
                >
                  <SelectTrigger id="flupsy-select">
                    <SelectValue placeholder="Seleziona FLUPSY" />
                  </SelectTrigger>
                  <SelectContent>
                    {flupsys && flupsys.map((flupsy) => (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        {flupsy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Separatore verticale */}
              <div className="hidden sm:block h-14 w-px bg-muted"></div>
              
              {/* Tipo di confronto */}
              <div className="flex-1">
                <Tabs value={currentTabId} onValueChange={setCurrentTabId} className="w-full">
                  <div className="mb-2 font-medium">Tipo di confronto</div>
                  <TabsList className="w-full">
                    <TabsTrigger value="data-futuro" className="flex-1 flex items-center justify-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Data futura
                    </TabsTrigger>
                    <TabsTrigger value="taglia-target" className="flex-1 flex items-center justify-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Taglia target
                    </TabsTrigger>
                    <TabsTrigger value="timeline-taglie" className="flex-1 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Timeline taglie
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Impostazioni specifiche per tab */}
        <Card>
          <CardContent className="pt-6">
            {currentTabId === 'data-futuro' && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Proiezione a giorni futuri:</span>
                  <Badge>{daysInFuture} giorni</Badge>
                </div>
                <Slider
                  value={[daysInFuture]}
                  min={10}
                  max={120}
                  step={10}
                  onValueChange={(value) => setDaysInFuture(value[0])}
                />
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {format(new Date(), 'dd/MM/yyyy')} 
                  <ArrowRight className="inline mx-2 w-3 h-3" /> 
                  {format(addDays(new Date(), daysInFuture), 'dd/MM/yyyy')}
                </div>
              </div>
            )}
            
            {currentTabId === 'taglia-target' && (
              <div>
                <div className="text-sm font-medium mb-2">Seleziona taglia target:</div>
                <Select 
                  value={targetSizeCode} 
                  onValueChange={setTargetSizeCode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona taglia target" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes && sizes.map((size: Size) => (
                      <SelectItem key={size.id} value={size.code}>
                        {size.code} - {size.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {currentTabId === 'timeline-taglie' && (
              <div>
                <div className="text-sm font-medium mb-2">Giorni di proiezione per la timeline:</div>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[daysInFuture]}
                    onValueChange={(value) => setDaysInFuture(value[0])}
                    max={180}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className="bg-muted px-3 py-1 rounded text-sm min-w-16 text-center">{daysInFuture} giorni</span>
                </div>
                <div className="text-xs text-muted-foreground mt-3">
                  Visualizzazione delle taglie raggiungibili entro i prossimi {daysInFuture} giorni.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Visualizzazione principale */}
      {currentTabId !== 'timeline-taglie' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Stato attuale */}
          <Card>
            <CardHeader>
              <CardTitle>Stato attuale</CardTitle>
              <CardDescription>
                Visualizzazione corrente del FLUPSY {selectedFlupsy?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBaskets || isLoadingFlupsys ? (
                <div className="text-center py-4">Caricamento...</div>
              ) : (
                renderFlupsy(renderCurrentBasket)
              )}
            </CardContent>
          </Card>
          
          {/* Stato futuro */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentTabId === 'data-futuro' 
                  ? `Stato futuro (${format(addDays(new Date(), daysInFuture), 'dd/MM/yyyy')})` 
                  : `Vongole che raggiungeranno la taglia ${targetSizeCode}`}
              </CardTitle>
              <CardDescription>
                {currentTabId === 'data-futuro' 
                  ? `Proiezione a ${daysInFuture} giorni da oggi` 
                  : `Tempistica prevista per raggiungere la taglia ${targetSizeCode}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBaskets || isLoadingFlupsys ? (
                <div className="text-center py-4">Caricamento...</div>
              ) : (
                renderFlupsy(
                  currentTabId === 'data-futuro' 
                    ? renderFutureBasketByDate 
                    : renderFutureBasketBySize
                )
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-8">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Timeline delle taglie future</CardTitle>
              <CardDescription>
                Proiezione delle taglie raggiungibili nei prossimi {daysInFuture} giorni
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingBaskets || isLoadingFlupsys || !sizes ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p>Caricamento dati in corso...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-t bg-muted/30">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground" style={{width: "10%"}}>Cestello</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground" style={{width: "20%"}}>Posizione</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground" style={{width: "15%"}}>Stato attuale</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground" style={{width: "55%"}}>Previsione taglie future</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluspyBaskets.map(basket => {
                        const latestOperation = getLatestOperationForBasket(basket.id);
                        if (!latestOperation || latestOperation.animalsPerKg === null) return null;
                        
                        // Calcola il peso attuale in mg
                        const currentWeight = latestOperation.animalsPerKg ? Math.round(1000000 / latestOperation.animalsPerKg) : 0;
                        const currentSize = currentWeight ? getTargetSizeForWeight(currentWeight, sizes) : null;
                        
                        // Timeline delle taglie
                        const timelineDates: TimelineItem[] = [];
                        
                        // Trova tutte le taglie successive alla taglia corrente
                        if (sizes && sizes.length > 0) {
                          const sortedSizes = [...sizes].sort((a, b) => {
                            // Se minAnimalsPerKg è null, considera come se fosse infinito (taglia più piccola)
                            const aMin = a.minAnimalsPerKg || Number.MAX_SAFE_INTEGER;
                            const bMin = b.minAnimalsPerKg || Number.MAX_SAFE_INTEGER;
                            
                            // Ordine decrescente: taglie più grandi prima (minAnimalsPerKg più basso)
                            return aMin - bMin;
                          });
                          
                          for (const size of sortedSizes) {
                            // Salta la taglia se non ha un valore minAnimalsPerKg
                            if (!size.minAnimalsPerKg) continue;
                            
                            // Calcola il peso target in mg
                            const targetWeight = 1000000 / size.minAnimalsPerKg;
                            
                            // Salta la taglia se è già stata raggiunta o è più piccola della taglia attuale
                            if (currentWeight >= targetWeight) continue;
                            
                            // Calcola i giorni necessari per raggiungere questa taglia
                            const daysToReach = getDaysToReachTargetSize(basket.id, size.code);
                            
                            // Se non c'è una stima dei giorni necessari o supera i giorni di proiezione, salta
                            if (!daysToReach || daysToReach > daysInFuture) continue;
                            
                            // Calcola la data prevista
                            const targetDate = daysToReach > 0 
                              ? addDays(new Date(), daysToReach)
                              : new Date(); // oggi se la taglia è già raggiunta
                            
                            // Determina il colore per la taglia
                            const sizeColor = getSizeColor(size.code);
                            
                            // Aggiungi alla timeline
                            timelineDates.push({
                              size: size.code,
                              name: size.name,
                              days: daysToReach,
                              date: targetDate,
                              color: sizeColor
                            });
                          }
                        }
                        
                        // Ordina le date per giorni necessari (prima le più vicine)
                        timelineDates.sort((a, b) => (a.days || 0) - (b.days || 0));
                        
                        return (
                          <tr key={basket.id} className="border-b hover:bg-muted/20">
                            <td className="px-4 py-4 font-medium" style={{width: "10%"}}>
                              <div className="flex items-center">
                                <span className="text-lg"># {basket.physicalNumber}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4" style={{width: "20%"}}>
                              <div className="flex items-center">
                                <div className="bg-muted/40 rounded-md px-2 py-1 text-xs mr-2">
                                  {selectedFlupsy?.name || "N/A"}
                                </div>
                                <Badge variant="outline">{basket.row} {basket.position}</Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4" style={{width: "15%"}}>
                              <div className="flex flex-col space-y-1">
                                {currentSize ? (
                                  <Badge className={`${getSizeColor(currentSize.code)} mb-1`}>
                                    {currentSize.code}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline">Non specificata</Badge>
                                )}
                                <div className="text-xs text-muted-foreground">
                                  {currentWeight} mg
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4" style={{width: "55%"}}>
                              {timelineDates.length > 0 ? (
                                <div className="relative">
                                  <div className="absolute left-[10px] top-0 bottom-0 w-[2px] bg-muted h-full z-0"></div>
                                  
                                  {timelineDates.map((item, i) => (
                                    <div key={item.size} className="relative z-10 flex items-start mb-3 last:mb-0">
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.color} shadow-sm mr-3`}>
                                        {i+1}
                                      </div>
                                      <div className="bg-background rounded-lg border p-3 shadow-sm flex-1">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <Badge className={item.color}>
                                              {item.size}
                                            </Badge>
                                            <div className="mt-1 text-sm">{item.name}</div>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <div className="text-sm font-medium flex items-center">
                                              <Clock className="h-3 w-3 mr-1" />
                                              <span>{item.days} giorni</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              <span>{format(item.date!, 'dd/MM/yyyy')}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-16 text-muted-foreground bg-muted/20 rounded-lg">
                                  Nessuna taglia raggiungibile entro {daysInFuture} giorni
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      

    </div>
  );
}