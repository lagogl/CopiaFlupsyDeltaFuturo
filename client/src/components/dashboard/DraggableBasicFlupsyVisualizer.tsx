import React from 'react';
import { useDrag } from 'react-dnd';
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

// Item type for drag and drop
const ItemTypes = {
  BASKET: 'basket'
};

// Componente per una cesta trascinabile
function DraggableBasket({ basket, children, onClick }: { basket: any, children: React.ReactNode, onClick?: () => void }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BASKET,
    item: {
      id: basket.id,
      sourceRow: basket.row,
      sourcePosition: basket.position
    },
    canDrag: basket.state === 'active' && basket.currentCycleId !== null,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag} 
      className={`cursor-grab ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default function DraggableBasicFlupsyVisualizer() {
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
                    <span className="text-[10px] font-medium ml-0.5">
                      {sgr.value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })()}
            
            {/* Data operazione e tipo */}
            <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
              <div className="text-[10px] font-medium text-slate-500">Op:</div>
              <div className="text-[10px]">
                {getOperationTypeLabel(latestOperation.type)} {format(new Date(latestOperation.date), 'dd/MM', { locale: it })}
              </div>
            </div>
            
            {/* Data inizio ciclo */}
            {basket?.currentCycleId && cycles && (
              (() => {
                const cycle = cycles.find((c: any) => c.id === basket.currentCycleId);
                
                if (!cycle) return null;
                
                const cycleStartDate = new Date(cycle.startDate);
                const now = new Date();
                const daysDiff = Math.floor((now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div className="flex justify-between items-center bg-slate-50 px-1 py-0.5 rounded-md">
                    <div className="text-[10px] font-medium text-slate-500">Ciclo:</div>
                    <div className="text-[10px]">
                      {format(cycleStartDate, 'dd/MM/yy', { locale: it })} 
                      <span className="text-[8px] ml-1 bg-slate-200 px-1 py-0.5 rounded-sm">
                        {daysDiff}g
                      </span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
        
        {(!latestOperation?.animalsPerKg || !basket?.currentCycleId || basket?.state !== 'active') && (
          <div className="p-1 text-center">
            {basket ? (
              basket.state === 'active' ? (
                <span className="text-[10px]">CESTA #{basket.physicalNumber}<br/>Ciclo non attivo</span>
              ) : (
                <span className="text-[10px]">CESTA #{basket.physicalNumber}<br/>In deposito</span>
              )
            ) : (
              <span className="text-[9px] text-slate-400">Vuoto</span>
            )}
          </div>
        )}
      </div>
    );
    
    // Render final result
    return (
      <TooltipProvider key={`${flupsyId}-${row}-${position}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`relative rounded-md ${borderClass} ${bgClass} h-full w-full overflow-hidden transition-all`}
            >
              {basket ? (
                <DraggableBasket 
                  basket={basket} 
                  onClick={() => handleBasketClick(basket)}
                >
                  {basketContent}
                </DraggableBasket>
              ) : (
                <div className="h-full w-full p-1">
                  {basketContent}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="max-w-sm p-4">
            {basket ? (
              <>
                <div className="font-bold mb-1">Cesta #{basket.physicalNumber}</div>
                <div className="text-sm mb-2">
                  <span className="font-medium">Posizione:</span> {row} - {position}
                </div>
                
                {latestOperation && (
                  <>
                    <Separator className="my-2" />
                    
                    <div className="flex flex-col gap-1">
                      <div className="text-sm">
                        <span className="font-medium">Ultima operazione:</span> {getOperationTypeLabel(latestOperation.type)}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Data:</span> {format(new Date(latestOperation.date), 'dd/MM/yyyy', { locale: it })}
                      </div>
                      
                      {latestOperation.animalsPerKg && (
                        <>
                          <div className="text-sm">
                            <span className="font-medium">Animali per kg:</span> {latestOperation.animalsPerKg.toLocaleString('it-IT')}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Peso medio:</span> {averageWeight ? `${averageWeight.toLocaleString('it-IT')} mg` : 'N/D'}
                          </div>
                        </>
                      )}
                      
                      {latestOperation.animalCount && (
                        <div className="text-sm">
                          <span className="font-medium">Totale animali:</span> {latestOperation.animalCount.toLocaleString('it-IT')}
                        </div>
                      )}
                      
                      {latestOperation.notes && (
                        <div className="text-sm mt-1">
                          <span className="font-medium">Note:</span> {latestOperation.notes}
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {basket.currentCycleId && cycles && (
                  (() => {
                    const cycle = cycles.find((c: any) => c.id === basket.currentCycleId);
                    
                    if (!cycle) return null;
                    
                    const cycleStartDate = new Date(cycle.startDate);
                    const now = new Date();
                    const daysDiff = Math.floor((now.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <>
                        <Separator className="my-2" />
                        
                        <div className="flex flex-col gap-1">
                          <div className="text-sm">
                            <span className="font-medium">Ciclo attivo dal:</span> {format(cycleStartDate, 'dd/MM/yyyy', { locale: it })}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Durata:</span> {daysDiff} giorni
                          </div>
                        </div>
                      </>
                    );
                  })()
                )}
              </>
            ) : (
              <div className="text-sm">Posizione vuota</div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // Calculate growth rates and other metrics for badge assignment
  const calculateFlupsyBadges = (flupsyId: number) => {
    if (!baskets || !operations || !cycles) {
      return {
        topSgr: [],
        topPopulation: [],
        oldestCycles: []
      };
    }
    
    // Ceste di questo flupsy con cicli attivi
    const flupsyBaskets = baskets.filter((b: any) => 
      b.flupsyId === flupsyId && 
      b.state === 'active' && 
      b.currentCycleId !== null
    );
    
    if (flupsyBaskets.length === 0) {
      return {
        topSgr: [],
        topPopulation: [],
        oldestCycles: []
      };
    }
    
    // Calcola SGR per ogni cesta
    const basketsWithSgr = flupsyBaskets.map((basket: any) => {
      const latestOp = getLatestOperation(basket.id);
      const prevOp = getPreviousOperation(basket.id);
      const sgr = calculateSGR(latestOp, prevOp);
      
      // Ottieni il ciclo attivo
      const cycle = cycles.find((c: any) => c.id === basket.currentCycleId);
      const cycleStartDate = cycle ? new Date(cycle.startDate) : null;
      const cycleDuration = cycleStartDate 
        ? Math.floor((new Date().getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        id: basket.id,
        sgr: sgr ? sgr.value : null,
        animalCount: latestOp?.animalCount || 0,
        cycleDuration
      };
    }).filter((b: any) => b.sgr !== null || b.animalCount > 0 || b.cycleDuration > 0);
    
    // Ordina per SGR (crescita)
    const topSgrBaskets = [...basketsWithSgr]
      .sort((a, b) => (b.sgr || 0) - (a.sgr || 0))
      .slice(0, badgeCounts.topSgr)
      .map(b => b.id);
    
    // Ordina per popolazione
    const topPopulationBaskets = [...basketsWithSgr]
      .sort((a, b) => b.animalCount - a.animalCount)
      .slice(0, badgeCounts.topPopulation)
      .map(b => b.id);
    
    // Ordina per durata ciclo
    const oldestCyclesBaskets = [...basketsWithSgr]
      .sort((a, b) => b.cycleDuration - a.cycleDuration)
      .slice(0, badgeCounts.oldestCycles)
      .map(b => b.id);
    
    return {
      topSgr: topSgrBaskets,
      topPopulation: topPopulationBaskets,
      oldestCycles: oldestCyclesBaskets
    };
  };
  
  // Render a single FLUPSY container
  const renderFlupsy = (flupsy: any) => {
    // Calculate badges for this flupsy
    const flupsyBadges = calculateFlupsyBadges(flupsy.id);
    
    return (
      <Card key={flupsy.id} className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{flupsy.name}</CardTitle>
              <CardDescription>{flupsy.location}</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 flex items-center justify-center">
                <Fan className="h-4 w-4 animate-spin-slow" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* SX row */}
          <div className="pb-4">
            <div className="flex items-center mb-1">
              <Badge variant="outline" className="text-xs font-normal">Fila SX</Badge>
            </div>
            <div className="grid grid-cols-6 gap-1 md:grid-cols-8 lg:grid-cols-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`${flupsy.id}-SX-${i + 1}`} className="aspect-square">
                  {renderBasketPosition(flupsy.id, 'SX', i + 1, flupsyBadges)}
                </div>
              ))}
            </div>
          </div>
          
          {/* DX row */}
          <div>
            <div className="flex items-center mb-1">
              <Badge variant="outline" className="text-xs font-normal">Fila DX</Badge>
            </div>
            <div className="grid grid-cols-6 gap-1 md:grid-cols-8 lg:grid-cols-12">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={`${flupsy.id}-DX-${i + 1}`} className="aspect-square">
                  {renderBasketPosition(flupsy.id, 'DX', i + 1, flupsyBadges)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Render main component
  return (
    <Card>
      <CardHeader>
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Trascina le ceste per effettuare operazioni o clicca per vedere i dettagli.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {flupsys?.map((flupsy: any) => renderFlupsy(flupsy))}
      </CardContent>
    </Card>
  );
}