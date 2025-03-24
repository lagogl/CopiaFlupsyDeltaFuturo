import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, addDays, differenceInWeeks } from 'date-fns';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
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
      return 'bg-gray-500 text-white border-gray-700';
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
  const renderCurrentBasket = (basket) => {
    if (!basket) return (
      <div className="basket-card p-1 rounded border-2 border-dashed border-gray-300 h-16 w-36 flex items-center justify-center text-gray-400 text-xs">
        Vuoto
      </div>
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
    
    return (
      <div 
        className={`basket-card p-1 rounded border-2 ${colorClass} h-16 w-36 flex flex-col justify-between`}
        onClick={() => {}}
      >
        <div className="flex justify-between items-start">
          <span className="font-bold text-[9px]">#{basket.physicalNumber}</span>
          {cycle && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
              C#{cycle.id}
            </Badge>
          )}
        </div>
        
        {currentSize && (
          <div className="flex justify-between items-center">
            <Badge className="text-[8px] px-1 py-0 h-4 bg-blue-500 text-white">
              {currentSize.code}
            </Badge>
            <div className="text-[8px]">{currentWeight} mg</div>
          </div>
        )}
        
        {latestOperation && (
          <div className="mt-auto text-[8px] flex justify-between items-center">
            <div>{format(new Date(latestOperation.date), 'dd/MM')}</div>
            <div className="opacity-70">{latestOperation.type}</div>
          </div>
        )}
      </div>
    );
  };

  // Renderizza un cestello per la visualizzazione futura (per data)
  const renderFutureBasketByDate = (basket) => {
    if (!basket) return (
      <div className="basket-card p-1 rounded border-2 border-dashed border-gray-300 h-16 w-36 flex items-center justify-center text-gray-400 text-xs">
        Vuoto
      </div>
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
    
    return (
      <div 
        className={`basket-card p-1 rounded border-2 ${colorClass} h-16 w-36 flex flex-col justify-between`}
        onClick={() => {}}
      >
        <div className="flex justify-between items-start">
          <span className="font-bold text-[9px]">#{basket.physicalNumber}</span>
          {cycle && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
              C#{cycle.id}
            </Badge>
          )}
        </div>
        
        {futureSize && (
          <div className="flex justify-between items-center">
            <Badge className="text-[8px] px-1 py-0 h-4 bg-blue-500 text-white">
              {futureSize.code}
            </Badge>
            <div className="text-[8px]">{futureWeight} mg</div>
          </div>
        )}
        
        {growthPercentage !== null && (
          <div className="mt-auto flex justify-between items-center">
            <Badge className={`text-[8px] px-1 py-0 h-4 ${growthPercentage > 20 ? "bg-green-500 text-white" : "bg-gray-200"}`}>
              +{growthPercentage}%
            </Badge>
            <div className="opacity-70 text-[8px]">
              {format(addDays(new Date(), daysInFuture), 'dd/MM')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizza un cestello per la visualizzazione futura (per taglia target)
  const renderFutureBasketBySize = (basket) => {
    if (!basket) return (
      <div className="basket-card p-1 rounded border-2 border-dashed border-gray-300 h-16 w-36 flex items-center justify-center text-gray-400 text-xs">
        Vuoto
      </div>
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
    
    return (
      <div 
        className={`basket-card p-1 rounded border-2 ${colorClass} h-16 w-36 flex flex-col justify-between ${!willReach ? 'opacity-40' : ''}`}
        onClick={() => {}}
      >
        <div className="flex justify-between items-start">
          <span className="font-bold text-[9px]">#{basket.physicalNumber}</span>
          {cycle && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
              C#{cycle.id}
            </Badge>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          {currentSize?.code === targetSizeCode ? (
            <Badge className="text-[8px] px-1 py-0 h-4 bg-green-500 text-white">Già {targetSizeCode}</Badge>
          ) : willReach ? (
            <Badge className="text-[8px] px-1 py-0 h-4 bg-blue-500 text-white">→{targetSizeCode}</Badge>
          ) : (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">No</Badge>
          )}
          
          {daysToReach !== null && daysToReach > 0 && (
            <div className="text-[8px]">
              {daysToReach}g
            </div>
          )}
        </div>
        
        {daysToReach !== null && daysToReach > 0 && (
          <div className="mt-auto flex justify-between items-center">
            <div className="opacity-70 text-[8px]">
              {format(addDays(new Date(), daysToReach), 'dd/MM')}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Renderizza la griglia del FLUPSY
  const renderFlupsy = (renderBasketFn) => {
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
                const basket = fluspyBaskets.find(b => b.row === 'SX' && b.position === position);
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
                const basket = fluspyBaskets.find(b => b.row === 'DX' && b.position === position);
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card selezione FLUPSY */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-md">Seleziona Unità FLUPSY</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedFlupsyId?.toString() || ''} 
              onValueChange={(value) => setSelectedFlupsyId(parseInt(value, 10))}
            >
              <SelectTrigger>
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
          </CardContent>
        </Card>
        
        {/* Card visualizzazione */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-md">Tipo di confronto</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={currentTabId} onValueChange={setCurrentTabId} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="data-futuro" className="flex-1 flex items-center justify-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Data futura
                </TabsTrigger>
                <TabsTrigger value="taglia-target" className="flex-1 flex items-center justify-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Taglia target
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Card impostazioni */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-md">
              {currentTabId === 'data-futuro' ? 'Giorni nel futuro' : 'Taglia target'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTabId === 'data-futuro' ? (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Proiezione a:</span>
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
            ) : (
              <Select 
                value={targetSizeCode} 
                onValueChange={setTargetSizeCode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona taglia target" />
                </SelectTrigger>
                <SelectContent>
                  {sizes && sizes.map((size) => (
                    <SelectItem key={size.id} value={size.code}>
                      {size.code} - {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Visualizzazione principale */}
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
      

    </div>
  );
}