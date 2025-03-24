import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { calculateAverageWeight, getSizeFromAnimalsPerKg, TARGET_SIZES, getOperationTypeLabel } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus, Fan } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BasicFlupsyVisualizer() {
  const [, navigate] = useLocation();
  
  // Stato per il numero di badge da mostrare per categoria
  const [badgeCounts, setBadgeCounts] = React.useState({
    topSgr: 3,       // Prime 3 ceste con il miglior tasso di crescita
    topPopulation: 3, // Prime 3 ceste con più animali
    oldestCycles: 3   // Prime 3 ceste con cicli più vecchi
  });
  
  // Fetch data
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({ 
    queryKey: ['/api/flupsys'] 
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({ 
    queryKey: ['/api/baskets'] 
  });
  
  const { data: operations } = useQuery({ 
    queryKey: ['/api/operations'] 
  });
  
  const { data: cycles } = useQuery({ 
    queryKey: ['/api/cycles'] 
  });
  
  const { data: lots } = useQuery({ 
    queryKey: ['/api/lots'] 
  });
  
  // Handler per aggiornare i contatori dei badge
  const handleBadgeCountChange = (category: 'topSgr' | 'topPopulation' | 'oldestCycles', value: number) => {
    setBadgeCounts(prev => ({
      ...prev,
      [category]: value
    }));
  };
  
  if (isLoadingFlupsys || isLoadingBaskets) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visualizzazione FLUPSY</CardTitle>
          <CardDescription>Caricamento in corso...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Helper function to get latest operation for a basket
  const getLatestOperation = (basketId: number) => {
    if (!operations) return null;
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    if (basketOperations.length === 0) return null;
    
    return basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };
  
  // Helper function to get the second-to-last operation for a basket
  const getPreviousOperation = (basketId: number) => {
    if (!operations) return null;
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    if (basketOperations.length <= 1) return null;
    
    return basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[1];
  };
  
  // Calculate SGR between two operations
  const calculateSGR = (currentOp: any, prevOp: any) => {
    if (!currentOp || !prevOp || !currentOp.animalsPerKg || !prevOp.animalsPerKg) return null;
    
    const currentWeight = calculateAverageWeight(currentOp.animalsPerKg);
    const prevWeight = calculateAverageWeight(prevOp.animalsPerKg);
    
    if (!currentWeight || !prevWeight) return null;
    
    const currentDate = new Date(currentOp.date);
    const prevDate = new Date(prevOp.date);
    const daysDiff = Math.max(1, Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calcola SGR giornaliero in percentuale
    const sgrDaily = ((Math.log(currentWeight) - Math.log(prevWeight)) / daysDiff) * 100;
    
    return {
      value: sgrDaily,
      isPositive: sgrDaily > 0,
      intensity: Math.abs(sgrDaily) > 2 ? 'high' : Math.abs(sgrDaily) > 0.5 ? 'medium' : 'low'
    };
  };
  
  // Handle basket click
  const handleBasketClick = (basket: any) => {
    if (!basket) return;
    
    if (basket.state === 'active' && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    } else {
      navigate('/baskets');
    }
  };
  
  // Render basket cell
  const renderBasketPosition = (flupsyId: number, row: string, position: number, flupsyBadges: any = { topSgr: [], topPopulation: [], oldestCycles: [] }) => {
    // Find all baskets at this position (resolve conflicts)
    const basketsAtPosition = baskets?.filter((b: any) => 
      b.flupsyId === flupsyId && 
      b.row === row && 
      b.position === position
    ) || [];
    
    // Prioritize active baskets over available ones
    const basket = basketsAtPosition.find((b: any) => b.state === 'active') || 
                  (basketsAtPosition.length > 0 ? basketsAtPosition[0] : undefined);
    
    // Get the latest operation for the basket to determine styling
    const latestOperation = basket ? getLatestOperation(basket.id) : null;
    const averageWeight = latestOperation?.animalsPerKg ? calculateAverageWeight(latestOperation.animalsPerKg) : null;
    
    // Base styling
    let borderClass = 'border border-dashed border-slate-300';
    let bgClass = 'bg-slate-50';
    
    // Stile per cestelli presenti ma non attivi (in deposito)
    if (basket && basket.state !== 'active') {
      borderClass = 'border-2 border-dashed border-slate-400';
      bgClass = 'bg-slate-100/50';
    }
    
    // Stile più evidente SOLO per cestelli con ciclo attivo
    if (basket && basket.state === 'active' && basket.currentCycleId) {
      // Base styling for active baskets
      borderClass = 'border-blue-400 border-2';
      bgClass = 'bg-white';
      
      // Special styling for baskets with weight data
      if (latestOperation) {
        // Prioritize the database size value from the relation
        const sizeCode = latestOperation.size?.code;
        
        // Make active baskets with weight data stand out based on size
        if (sizeCode) {
          // Determine style based on TP- codes from database
          if (sizeCode.startsWith('TP-')) {
            const num = parseInt(sizeCode.replace('TP-', ''));
            
            if (num >= 6000) {
              // TP-6000 e superiori - Commerciale grande
              borderClass = 'border-red-600 border-4';
              bgClass = 'bg-red-50';
            } else if (num >= 4000 && num < 6000) {
              // TP-4000, TP-5000 - Commerciale
              borderClass = 'border-red-500 border-3';
              bgClass = 'bg-red-50';
            } else if (num >= 3000 && num < 4000) {
              // TP-3000 - Pre-vendita
              borderClass = 'border-orange-500 border-2';
              bgClass = 'bg-orange-50';
            } else if (num >= 2000 && num < 3000) {
              // TP-2000 - Ingrasso avanzato
              borderClass = 'border-yellow-500 border-2';
              bgClass = 'bg-yellow-50';
            } else if (num >= 1500 && num < 2000) {
              // TP-1500 - Ingrasso iniziale
              borderClass = 'border-green-600 border-2';
              bgClass = 'bg-green-50';
            } else if (num >= 1000 && num < 1500) {
              // TP-1000, TP-1140 - Pre-ingrasso avanzato
              borderClass = 'border-sky-500 border-2';
              bgClass = 'bg-sky-50';
            } else {
              // TP-800 e inferiori - Pre-ingrasso iniziale
              borderClass = 'border-sky-400 border-2';
              bgClass = 'bg-sky-50';
            }
          } else {
            // Fallback se non è un codice TP-
            borderClass = 'border-blue-400 border-2';
            bgClass = 'bg-white';
          }
        } else if (latestOperation.animalsPerKg) {
          // Fallback utilizzando animalsPerKg se non c'è size
          const targetSize = getSizeFromAnimalsPerKg(latestOperation.animalsPerKg);
          
          if (targetSize) {
            const fallbackSizeCode = targetSize.code;
            
            if (fallbackSizeCode === 'T7') {
              borderClass = 'border-red-600 border-4';
              bgClass = 'bg-red-50';
            } else if (fallbackSizeCode === 'T6') {
              borderClass = 'border-red-500 border-3';
              bgClass = 'bg-red-50';
            } else if (fallbackSizeCode === 'T5') {
              borderClass = 'border-orange-500 border-2';
              bgClass = 'bg-orange-50';
            } else if (fallbackSizeCode === 'T4') {
              borderClass = 'border-yellow-500 border-2';
              bgClass = 'bg-yellow-50';
            } else if (fallbackSizeCode === 'T3') {
              borderClass = 'border-green-600 border-2';
              bgClass = 'bg-green-50';
            } else if (fallbackSizeCode === 'T2') {
              borderClass = 'border-sky-500 border-2';
              bgClass = 'bg-sky-50';
            } else if (fallbackSizeCode === 'T1') {
              borderClass = 'border-sky-400 border-2';
              bgClass = 'bg-sky-50';
            }
          }
        }
      }
    }
    
    // Calcola indicatori speciali per questa cesta usando i badge calcolati per il flupsy
    let isTopSgr = false;
    let isHighPopulation = false;
    let isOldBasket = false;
    
    // Verifica se il basket attuale è nella lista dei top baskets per questo flupsy
    if (basket) {
      isTopSgr = flupsyBadges.topSgr.includes(basket.id);
      isHighPopulation = flupsyBadges.topPopulation.includes(basket.id);
      isOldBasket = flupsyBadges.oldestCycles.includes(basket.id);
    }
    
    // Contenuto principale della cesta
    const basketContent = (
      <div className={`font-semibold ${basket?.state !== 'active' ? 'text-slate-400' : ''}`}>
        {latestOperation?.animalsPerKg && basket?.state === 'active' && basket.currentCycleId && (
          <div className="flex flex-col gap-y-0.5 mt-1">
            {/* Numero cesta con bordo colorato e più evidente */}
            <div className="bg-slate-200 py-0.5 px-1 mb-1 text-center rounded-t-md relative">
              <span className="text-[10px] font-bold text-slate-700">
                CESTA #{basket.physicalNumber}
              </span>
              
              {/* Badge indicatori */}
              <div className="absolute -top-2 -right-2 flex gap-0.5">
                {isTopSgr && (
                  <div className="h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-sm" 
                       title="Top SGR">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                )}
                
                {isHighPopulation && (
                  <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm" 
                       title="Alta popolazione">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
                
                {isOldBasket && (
                  <div className="h-4 w-4 rounded-full bg-gray-400 flex items-center justify-center text-white shadow-sm" 
                       title="Ciclo anziano">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            
            {/* Taglia */}
            <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
              <div className="text-[10px] font-medium text-slate-500">Taglia:</div>
              <div className="text-[12px] font-bold">
                {latestOperation.size?.code || getSizeFromAnimalsPerKg(latestOperation.animalsPerKg)?.code || 'N/D'}
              </div>
            </div>
            
            {/* Quantità animali per kg formattata con separatori */}
            <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
              <div className="text-[10px] font-medium text-slate-500">Q.tà:</div>
              <div className="text-[11px]">
                {latestOperation.animalsPerKg.toLocaleString('it-IT')}/kg
              </div>
            </div>
            
            {/* Numero totale di animali dalla tabella operations */}
            <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
              <div className="text-[10px] font-medium text-slate-500">Tot:</div>
              <div className="text-[11px]">
                {latestOperation.animalCount 
                  ? latestOperation.animalCount.toLocaleString('it-IT') 
                  : "N/D"} animali
              </div>
            </div>
            
            {/* SGR Indicator */}
            {(() => {
              const prevOp = getPreviousOperation(basket.id);
              const sgr = calculateSGR(latestOperation, prevOp);
              
              if (!sgr) return null;
              
              let icon;
              let colorClass;
              let bgColorClass;
              
              // Intensity and direction of growth
              if (Math.abs(sgr.value) < 0.1) {
                // Crescita praticamente nulla
                icon = <Minus className="w-3 h-3" />;
                colorClass = "text-slate-500";
                bgColorClass = "bg-slate-50";
              } else if (sgr.isPositive) {
                if (sgr.intensity === 'high') {
                  icon = <TrendingUp className="w-3 h-3" />;
                  colorClass = "text-green-700";
                  bgColorClass = "bg-green-50";
                } else if (sgr.intensity === 'medium') {
                  icon = <ArrowUp className="w-3 h-3" />;
                  colorClass = "text-green-600";
                  bgColorClass = "bg-green-50";
                } else {
                  icon = <ArrowUp className="w-3 h-3" />;
                  colorClass = "text-green-500";
                  bgColorClass = "bg-green-50";
                }
              } else {
                if (sgr.intensity === 'high') {
                  icon = <TrendingDown className="w-3 h-3" />;
                  colorClass = "text-red-700";
                  bgColorClass = "bg-red-50";
                } else if (sgr.intensity === 'medium') {
                  icon = <ArrowDown className="w-3 h-3" />;
                  colorClass = "text-red-600";
                  bgColorClass = "bg-red-50";
                } else {
                  icon = <ArrowDown className="w-3 h-3" />;
                  colorClass = "text-red-500";
                  bgColorClass = "bg-red-50";
                }
              }
              
              return (
                <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
                  <div className="text-[10px] font-medium text-slate-500">SGR:</div>
                  <div className={`flex items-center ${colorClass} ${bgColorClass} px-1 py-0.5 rounded-md`}>
                    {icon}
                    <span className="text-[10px] ml-0.5 font-medium">
                      {sgr.value.toFixed(1).replace('.', ',')}%
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Data e ciclo */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 mt-0.5 text-[9px]">
              <div>
                <span className="text-slate-500">Op:</span>
                <span className="font-medium ml-0.5">
                  {latestOperation.type.slice(0, 3)} {format(new Date(latestOperation.date), 'dd/MM', { locale: it })}
                </span>
              </div>
              <div className="bg-blue-100 text-blue-800 font-semibold px-1 rounded">
                C{basket.currentCycleId}
              </div>
            </div>
          </div>
        )}
        {basket && basket.state !== 'active' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-xs font-semibold mt-2">
              CESTA #{basket.physicalNumber}
            </div>
            <div className="text-[11px] mt-1 text-slate-500">non attiva</div>
            <div className="mt-2 bg-slate-100 rounded-md px-2 py-1 text-[10px] text-slate-600">
              In deposito
            </div>
          </div>
        )}
        {basket?.state === 'active' && !basket.currentCycleId && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-xs font-semibold mt-2">
              CESTA #{basket.physicalNumber}
            </div>
            <div className="text-[11px] mt-1 text-slate-500">nessun ciclo attivo</div>
            <div className="mt-2 bg-slate-100 rounded-md px-2 py-1 text-[10px] text-slate-600">
              Avvia un nuovo ciclo per questa cesta
            </div>
          </div>
        )}
        {!basket && (
          <div className="text-slate-400">Pos. {position}</div>
        )}
      </div>
    );
    
    // Contenuto informativo dell'operazione da mostrare nel tooltip
    const tooltipContent = (basket && latestOperation) ? (
      <div className="w-72 p-2">
        <h4 className="font-bold text-sm mb-2 pb-1 border-b">Dettagli cesta #{basket.physicalNumber}</h4>
        
        <div className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Operazione:</span>
            <span>{getOperationTypeLabel(latestOperation.type)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Data:</span>
            <span>{format(new Date(latestOperation.date), 'dd/MM/yyyy', { locale: it })}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Ciclo:</span>
            <span>#{basket.currentCycleId}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">Animali per kg:</span>
            <span>{latestOperation.animalsPerKg.toLocaleString('it-IT')}</span>
          </div>
          
          {latestOperation.animalCount && (
            <div className="flex justify-between">
              <span className="font-medium">Totale animali:</span>
              <span>{latestOperation.animalCount.toLocaleString('it-IT')}</span>
            </div>
          )}
          
          {latestOperation.sizeId && (
            <div className="flex justify-between">
              <span className="font-medium">Taglia:</span>
              <span>{latestOperation.size?.code || getSizeFromAnimalsPerKg(latestOperation.animalsPerKg)?.code || 'N/D'}</span>
            </div>
          )}
          
          {latestOperation.lotId && (
            <>
              <div className="flex justify-between">
                <span className="font-medium">Lotto:</span>
                <span>#{latestOperation.lotId}</span>
              </div>
              {lots && (
                <div className="flex justify-between">
                  <span className="font-medium">Fornitore:</span>
                  <span>{lots.find((l: any) => l.id === latestOperation.lotId)?.supplier || 'N/D'}</span>
                </div>
              )}
            </>
          )}
          
          {latestOperation.deadCount !== null && (
            <div className="flex justify-between">
              <span className="font-medium">Mortalità:</span>
              <span>{latestOperation.deadCount} animali ({latestOperation.mortalityRate?.toFixed(1).replace('.', ',')}%)</span>
            </div>
          )}
          
          {latestOperation.notes && (
            <div className="mt-1 pt-1 border-t">
              <span className="font-medium">Note:</span>
              <p className="text-xs mt-1">{latestOperation.notes}</p>
            </div>
          )}
        </div>
      </div>
    ) : null;

    // Se la cesta è attiva, ha un'operazione e ha un ciclo, mostriamo il tooltip
    if (basket && basket.state === 'active' && basket.currentCycleId && latestOperation) {
      return (
        <TooltipProvider key={`tooltip-${flupsyId}-${row}-${position}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                onClick={() => handleBasketClick(basket)}
                className={`${borderClass} rounded-md p-1.5 text-center text-sm h-44 overflow-hidden
                  cursor-pointer hover:shadow-md transition-shadow ${bgClass}`}
              >
                {basketContent}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" align="start" className="z-50 bg-white">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    
    // Altrimenti mostriamo la cesta senza tooltip
    return (
      <div 
        key={`${flupsyId}-${row}-${position}`}
        onClick={() => basket && basket.state === 'active' && basket.currentCycleId && handleBasketClick(basket)}
        className={`${borderClass} rounded-md p-1.5 text-center text-sm h-44 overflow-hidden
          ${(basket && basket.state === 'active' && basket.currentCycleId) ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${bgClass}`}
      >
        {basketContent}
      </div>
    );
  };
  
  // Calcola i badge per ogni flupsy
  const calculateBadgesForFlupsy = (flupsyId: number) => {
    if (!baskets || !operations || !cycles) return { topSgr: [], topPopulation: [], oldestCycles: [] };
    
    // Filtra le ceste attive per questo flupsy
    const activeBaskets = baskets.filter((b: any) => 
      b.flupsyId === flupsyId && 
      b.state === 'active' && 
      b.currentCycleId !== null
    );
    
    // Calcola SGR per ogni cesta attiva
    const basketsWithSgr = activeBaskets
      .map((basket: any) => {
        const latestOp = getLatestOperation(basket.id);
        const prevOp = getPreviousOperation(basket.id);
        const sgr = calculateSGR(latestOp, prevOp);
        
        return { 
          basketId: basket.id, 
          sgrValue: sgr?.value || null,
          animalCount: latestOp?.animalCount || null,
          cycleAge: (() => {
            const cycle = cycles.find((c: any) => c.id === basket.currentCycleId);
            if (!cycle || !cycle.startDate) return null;
            
            const cycleStartDate = new Date(cycle.startDate);
            const now = new Date();
            return Math.floor((now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
          })()
        };
      })
      .filter(item => item.basketId !== null);
    
    // Top SGR (solo crescita positiva)
    const topSgrBaskets = basketsWithSgr
      .filter(b => b.sgrValue !== null && b.sgrValue > 0)
      .sort((a, b) => (b.sgrValue || 0) - (a.sgrValue || 0))
      .slice(0, badgeCounts.topSgr)
      .map(b => b.basketId);
    
    // Top popolazioni
    const topPopulationBaskets = basketsWithSgr
      .filter(b => b.animalCount !== null && b.animalCount > 0)
      .sort((a, b) => (b.animalCount || 0) - (a.animalCount || 0))
      .slice(0, badgeCounts.topPopulation)
      .map(b => b.basketId);
    
    // Cicli più anziani
    const oldestCycleBaskets = basketsWithSgr
      .filter(b => b.cycleAge !== null)
      .sort((a, b) => (b.cycleAge || 0) - (a.cycleAge || 0))
      .slice(0, badgeCounts.oldestCycles)
      .map(b => b.basketId);
      
    return {
      topSgr: topSgrBaskets,
      topPopulation: topPopulationBaskets,
      oldestCycles: oldestCycleBaskets
    };
  };
  
  // Render a single flupsy
  const renderFlupsy = (flupsy: any) => {
    // Calcola i badge per questo FLUPSY
    const flupsyBadges = calculateBadgesForFlupsy(flupsy.id);
    
    return (
      <div key={`flupsy-${flupsy.id}`} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{flupsy.name}</h3>
          <Badge variant="outline">{flupsy.location}</Badge>
        </div>
        
        {/* Container for aligned rows with propeller/fan icon on the left edge */}
        <div className="relative ml-8"> {/* Added margin to align both rows */}
          {/* Propeller/Fan icon positioned on the left edge, aligned with top */}
          <div className="absolute -left-14 top-0 z-10">
            <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center text-blue-700 border-2 border-blue-300">
              <Fan className="w-10 h-10 animate-spin-slow" />
            </div>
          </div>
          {/* DX row */}
          <div className="bg-white rounded-md p-3 shadow-sm mb-2">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                <span>DX</span>
              </div>
              <div className="text-sm font-medium">Fila DX</div>
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => 
                renderBasketPosition(flupsy.id, 'DX', i + 1, flupsyBadges)
              )}
            </div>
          </div>
          
          {/* SX row */}
          <div className="bg-white rounded-md p-3 shadow-sm mb-2">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                <span>SX</span>
              </div>
              <div className="text-sm font-medium">Fila SX</div>
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => 
                renderBasketPosition(flupsy.id, 'SX', i + 1, flupsyBadges)
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Disposizione delle ceste attive con cicli
        </CardDescription>
        
        {/* Selettori per il numero di badge da mostrare */}
        <div className="flex flex-wrap gap-4 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-col">
            <label htmlFor="topSgr" className="text-sm font-medium mb-1 flex items-center">
              <div className="h-4 w-4 rounded-full bg-amber-400 mr-1.5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              Top SGR: {badgeCounts.topSgr}
            </label>
            <input
              type="range"
              id="topSgr"
              min="0"
              max="5"
              step="1"
              value={badgeCounts.topSgr}
              onChange={(e) => handleBadgeCountChange('topSgr', parseInt(e.target.value))}
              className="w-36"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="topPopulation" className="text-sm font-medium mb-1 flex items-center">
              <div className="h-4 w-4 rounded-full bg-blue-500 mr-1.5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
              Top Popolazione: {badgeCounts.topPopulation}
            </label>
            <input
              type="range"
              id="topPopulation"
              min="0"
              max="5"
              step="1"
              value={badgeCounts.topPopulation}
              onChange={(e) => handleBadgeCountChange('topPopulation', parseInt(e.target.value))}
              className="w-36"
            />
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="oldestCycles" className="text-sm font-medium mb-1 flex items-center">
              <div className="h-4 w-4 rounded-full bg-gray-400 mr-1.5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              Cicli Anziani: {badgeCounts.oldestCycles}
            </label>
            <input
              type="range"
              id="oldestCycles"
              min="0"
              max="5"
              step="1"
              value={badgeCounts.oldestCycles}
              onChange={(e) => handleBadgeCountChange('oldestCycles', parseInt(e.target.value))}
              className="w-36"
            />
          </div>
        </div>
        
        {/* Legenda badge indicatori */}
        <div className="flex flex-wrap gap-3 mt-3 mb-3 border-b pb-3">
          <div className="flex items-center gap-1 text-xs">
            <div className="h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <span>Top {badgeCounts.topSgr} ceste con miglior crescita</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <span>Top {badgeCounts.topPopulation} ceste con maggiore popolazione</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="h-4 w-4 rounded-full bg-gray-400 flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Top {badgeCounts.oldestCycles} ceste con cicli più anziani</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Legenda taglie dettagliata basata sul sistema TP- */}
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-sky-400 bg-sky-50"></div>
            <span>TP-800 e inferiori (Pre-ingrasso iniziale)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-sky-500 bg-sky-50"></div>
            <span>TP-1000, TP-1140 (Pre-ingrasso avanzato)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-green-600 bg-green-50"></div>
            <span>TP-1500 (Ingrasso iniziale)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-yellow-500 bg-yellow-50"></div>
            <span>TP-2000 (Ingrasso avanzato)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-orange-500 bg-orange-50"></div>
            <span>TP-3000 (Pre-vendita)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-3 border-red-500 bg-red-50"></div>
            <span>TP-4000, TP-5000 (Commerciale)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-4 border-red-600 bg-red-50"></div>
            <span>TP-6000 e superiori (Commerciale grande)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-dashed border-slate-400 bg-slate-100/50"></div>
            <span>Cesta non attiva (in deposito)</span>
          </div>
        </div>
        
        {/* Legenda trend SGR */}
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md">
              <TrendingUp className="w-3 h-3" />
              <span className="ml-0.5 text-[10px] font-medium">+2,5%</span>
            </div>
            <span>Crescita forte</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">
              <ArrowUp className="w-3 h-3" />
              <span className="ml-0.5 text-[10px] font-medium">+1,2%</span>
            </div>
            <span>Crescita media</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-md">
              <Minus className="w-3 h-3" />
              <span className="ml-0.5 text-[10px] font-medium">0,0%</span>
            </div>
            <span>Stabile</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
              <ArrowDown className="w-3 h-3" />
              <span className="ml-0.5 text-[10px] font-medium">-1,5%</span>
            </div>
            <span>Decrescita</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {flupsys?.map((flupsy: any) => (
          <div key={flupsy.id}>
            {renderFlupsy(flupsy)}
            {flupsy.id !== flupsys[flupsys.length - 1].id && (
              <Separator className="my-4" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}