import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { calculateAverageWeight, getSizeFromAnimalsPerKg, TARGET_SIZES } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function BasicFlupsyVisualizer() {
  const [, navigate] = useLocation();
  
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
  const renderBasketPosition = (flupsyId: number, row: string, position: number) => {
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
    
    // Solo stile base per cestelli non attivi (anche se presenti)
    if (basket && basket.state !== 'active') {
      borderClass = 'border border-slate-200';
      bgClass = 'bg-slate-100/50';
    }
    
    // Stile più evidente SOLO per cestelli con ciclo attivo
    if (basket && basket.state === 'active' && basket.currentCycleId) {
      // Base styling for active baskets
      borderClass = 'border-blue-400 border-2';
      bgClass = 'bg-white';
      
      // Special styling for baskets with weight data
      if (latestOperation?.animalsPerKg) {
        const targetSize = getSizeFromAnimalsPerKg(latestOperation.animalsPerKg);
        console.log(`Basket #${basket.physicalNumber} at position ${row}-${position} has weight data: ${latestOperation.animalsPerKg} animals/kg (${Math.round(averageWeight || 0)} mg, taglia: ${targetSize?.code || 'N/D'})`);
        
        // Make active baskets with weight data stand out based on size
        if (targetSize) {
          const sizeCode = targetSize.code;
          
          if (sizeCode === 'T6' || sizeCode === 'T7') {
            // Taglie commerciali (T6-T7)
            borderClass = 'border-red-500 border-4';
            bgClass = 'bg-red-50';
          } else if (sizeCode === 'T5') {
            // Pre-vendita (T5)
            borderClass = 'border-orange-500 border-2';
            bgClass = 'bg-orange-50';
          } else if (sizeCode === 'T4') {
            // Ingrasso avanzato (T4)
            borderClass = 'border-yellow-500 border-2';
            bgClass = 'bg-yellow-50';
          } else if (sizeCode === 'T2' || sizeCode === 'T3' || sizeCode === 'T1') {
            // Pre-ingrasso e Ingrasso iniziale (T1-T2-T3)
            borderClass = 'border-green-500 border-2';
            bgClass = 'bg-green-50';
          }
        }
      }
    }
    
    return (
      <div 
        key={`${flupsyId}-${row}-${position}`} 
        onClick={() => basket && basket.state === 'active' && basket.currentCycleId && handleBasketClick(basket)}
        className={`${borderClass} rounded-md p-2 text-center text-sm h-28 
          ${(basket && basket.state === 'active' && basket.currentCycleId) ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${bgClass}`}
      >
        {basket ? (
          <div className={`font-semibold ${basket.state !== 'active' || !basket.currentCycleId ? 'text-slate-400' : ''}`}>
            #{basket.physicalNumber}
            {latestOperation?.animalsPerKg && basket.state === 'active' && basket.currentCycleId && (
              <div className="flex flex-col mt-1">
                <div className="flex justify-between items-center">
                  <div className="text-[11px] font-bold">
                    {getSizeFromAnimalsPerKg(latestOperation.animalsPerKg)?.code || 'N/D'}
                  </div>
                  
                  {/* SGR Indicator */}
                  {(() => {
                    const prevOp = getPreviousOperation(basket.id);
                    const sgr = calculateSGR(latestOperation, prevOp);
                    
                    if (!sgr) return null;
                    
                    let icon;
                    let colorClass;
                    
                    // Intensity and direction of growth
                    if (Math.abs(sgr.value) < 0.1) {
                      // Crescita praticamente nulla
                      icon = <Minus className="w-3 h-3" />;
                      colorClass = "text-slate-400";
                    } else if (sgr.isPositive) {
                      if (sgr.intensity === 'high') {
                        icon = <TrendingUp className="w-3 h-3" />;
                        colorClass = "text-green-600";
                      } else if (sgr.intensity === 'medium') {
                        icon = <ArrowUp className="w-3 h-3" />;
                        colorClass = "text-green-500";
                      } else {
                        icon = <ArrowUp className="w-3 h-3" />;
                        colorClass = "text-green-400";
                      }
                    } else {
                      if (sgr.intensity === 'high') {
                        icon = <TrendingDown className="w-3 h-3" />;
                        colorClass = "text-red-600";
                      } else if (sgr.intensity === 'medium') {
                        icon = <ArrowDown className="w-3 h-3" />;
                        colorClass = "text-red-500";
                      } else {
                        icon = <ArrowDown className="w-3 h-3" />;
                        colorClass = "text-red-400";
                      }
                    }
                    
                    return (
                      <div className={`flex items-center ${colorClass}`}>
                        {icon}
                        <span className="text-[8px] ml-0.5">
                          {sgr.value.toFixed(1).replace('.', ',')}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="text-[9px]">{latestOperation.animalsPerKg}/kg</div>
                <div className="text-[8px] mt-1 text-slate-500">
                  {format(new Date(latestOperation.date), 'dd/MM', { locale: it })}
                </div>
                <div className="text-[8px] text-slate-500 flex justify-between">
                  <span>{latestOperation.type.slice(0, 3)}</span>
                  <span>C{basket.currentCycleId}</span>
                </div>
              </div>
            )}
            {basket.state === 'active' && !basket.currentCycleId && (
              <div className="text-[9px] mt-1 text-slate-500">no ciclo</div>
            )}
          </div>
        ) : (
          <div className="text-slate-400">Pos. {position}</div>
        )}
      </div>
    );
  };
  
  // Render a single flupsy
  const renderFlupsy = (flupsy: any) => {
    return (
      <div key={`flupsy-${flupsy.id}`} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{flupsy.name}</h3>
          <Badge variant="outline">{flupsy.location}</Badge>
        </div>
        
        {/* DX row */}
        <div className="bg-white rounded-md p-3 shadow-sm mb-4">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
              <span>DX</span>
            </div>
            <div className="text-sm font-medium">Fila DX</div>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {Array.from({ length: 10 }, (_, i) => 
              renderBasketPosition(flupsy.id, 'DX', i + 1)
            )}
          </div>
        </div>
        
        {/* SX row */}
        <div className="bg-white rounded-md p-3 shadow-sm">
          <div className="flex items-center mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
              <span>SX</span>
            </div>
            <div className="text-sm font-medium">Fila SX</div>
          </div>
          
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {Array.from({ length: 10 }, (_, i) => 
              renderBasketPosition(flupsy.id, 'SX', i + 1)
            )}
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
        <div className="flex flex-wrap gap-2 mt-3">
          {/* Mostriamo le taglie principali per semplicità */}
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-green-500 bg-green-50"></div>
            <span>T1-T2-T3 (Pre-ingrasso)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-yellow-500 bg-yellow-50"></div>
            <span>T4 (Ingrasso avanzato)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-2 border-orange-500 bg-orange-50"></div>
            <span>T5 (Pre-vendita)</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded-sm border-4 border-red-500 bg-red-50"></div>
            <span>T6-T7 (Commerciale)</span>
          </div>
        </div>
        
        {/* Legenda trend SGR */}
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-green-600">
              <TrendingUp className="w-3 h-3" />
              <span className="ml-0.5 text-[9px]">+2,5%</span>
            </div>
            <span>Crescita forte</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-green-500">
              <ArrowUp className="w-3 h-3" />
              <span className="ml-0.5 text-[9px]">+1,2%</span>
            </div>
            <span>Crescita media</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-slate-400">
              <Minus className="w-3 h-3" />
              <span className="ml-0.5 text-[9px]">0,0%</span>
            </div>
            <span>Stabile</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <div className="flex items-center text-red-500">
              <ArrowDown className="w-3 h-3" />
              <span className="ml-0.5 text-[9px]">-1,5%</span>
            </div>
            <span>Decrescita</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {flupsys && flupsys.map((flupsy: any) => (
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