import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';
import { format, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  getOperationTypeLabel, 
  getTargetSizeForWeight, 
  getSizeFromAnimalsPerKg,
  getBasketColorBySize,
  getBorderThicknessByWeight,
  formatAnimalCount,
  monthlyToDaily
} from '@/lib/utils';
import { CheckSquare, Square, Filter, Eye, Layers, TrendingUp, TrendingDown, ArrowUp } from 'lucide-react';
import GrowthPerformanceIndicator from '@/components/GrowthPerformanceIndicator';

export default function FlupsyVisualizerNew() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [showFlupsySelector, setShowFlupsySelector] = useState<boolean>(false);
  
  // Tipi per i dati
  interface Flupsy {
    id: number;
    name: string;
    location: string;
  }
  
  interface Basket {
    id: number;
    physicalNumber: number;
    flupsyId: number;
    row: 'DX' | 'SX' | null;
    position: number | null;
    state: 'active' | 'available';
    currentCycleId: number | null;
  }
  
  interface Operation {
    id: number;
    basketId: number;
    date: string;
    type: string;
    notes: string | null;
    animalsPerKg: number | null;
  }
  
  interface Cycle {
    id: number;
    basketId: number;
    startDate: string;
    endDate: string | null;
    state: 'active' | 'closed';
  }

  // Fetch flupsys
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  // Fetch baskets
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Fetch operations
  const { data: operations } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });
  
  // Fetch cycles
  const { data: cycles } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });
  
  // Fetch SGR data
  const { data: sgrData } = useQuery<any[]>({
    queryKey: ['/api/sgr']
  });
  
  // Select all FLUPSYs by default
  if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
    setSelectedFlupsyIds(flupsys.map(f => f.id));
  }
  
  // Handle FLUPSY selection/deselection
  const toggleFlupsySelection = (id: number) => {
    if (selectedFlupsyIds.includes(id)) {
      // If already selected, remove it
      setSelectedFlupsyIds(selectedFlupsyIds.filter(fId => fId !== id));
    } else {
      // If not selected, add it
      setSelectedFlupsyIds([...selectedFlupsyIds, id]);
    }
  };
  
  // Select all FLUPSYs
  const selectAllFlupsys = () => {
    if (!flupsys) return;
    setSelectedFlupsyIds(flupsys.map(f => f.id));
  };
  
  // Deselect all FLUPSYs
  const deselectAllFlupsys = () => {
    setSelectedFlupsyIds([]);
  };

  // Get the currently active FLUPSY based on the selected tab
  const getActiveFlupsyId = (): number | null => {
    if (selectedTab === "all") {
      return null; // No specific FLUPSY is active in "all" view
    }
    
    const selectedId = parseInt(selectedTab, 10);
    return selectedFlupsyIds.includes(selectedId) ? selectedId : null;
  };
  
  const activeFlupsyId = getActiveFlupsyId();
  const selectedFlupsy = activeFlupsyId && flupsys ? flupsys.find(f => f.id === activeFlupsyId) : null;
  
  // Helper function to get cycle for a basket
  const getCycleForBasket = (basketId: number): Cycle | null => {
    if (!cycles) return null;
    return cycles.find(c => c.basketId === basketId) || null;
  };
  
  // Helper function to get operations for a basket
  const getOperationsForBasket = (basketId: number): Operation[] => {
    if (!operations) return [];
    return operations.filter(op => op.basketId === basketId);
  };
  
  // Function to get SGR data for a month
  const getSgrForMonth = (date: Date) => {
    if (!sgrData || sgrData.length === 0) return null;
    
    const month = format(date, 'MMMM', { locale: it }).toLowerCase();
    return sgrData.find((sgr: any) => sgr.month.toLowerCase() === month);
  };
  
  // Function to calculate theoretical growth based on SGR
  const calculateTheoreticalGrowth = (date: Date, days: number) => {
    const sgrInfo = getSgrForMonth(date);
    if (!sgrInfo) return null;
    
    // I valori SGR dal database sono già percentuali giornaliere
    // Li convertiamo in decimale per la formula di crescita (da % a decimale)
    const dailyRate = sgrInfo.percentage / 100;
    
    // Calcola la crescita teorica usando la formula corretta: Pf = Pi * e^(SGR*t)
    // Poiché calcoliamo la percentuale di crescita, iniziamo con Pi = 1
    // Formula: (Pf/Pi - 1) * 100 = (e^(SGR*t) - 1) * 100
    const theoreticalGrowthPercent = (Math.exp(dailyRate * days) - 1) * 100;
    
    return {
      sgrMonth: sgrInfo.month,
      sgrPercentage: sgrInfo.percentage,
      sgrDailyPercentage: sgrInfo.percentage, // Già in percentuale giornaliera
      theoreticalGrowthPercent
    };
  };
  
  // Function to calculate actual growth between two measurements
  const calculateActualGrowth = (currentWeight: number, previousWeight: number): number => {
    if (!currentWeight || !previousWeight || previousWeight === 0) return 0;
    return ((currentWeight - previousWeight) / previousWeight) * 100;
  };
  
  // Helper function to get the basket data needed for display
  const getBasketDisplayData = (basket: Basket | undefined): {
    colorClass: string;
    borderThicknessClass: string;
    targetSize: string | null;
    animalCount: string | null;
    averageWeight: number | null;
  } => {
    if (!basket) return {
      colorClass: 'bg-gray-50 border-dashed',
      borderThicknessClass: 'border',
      targetSize: null,
      animalCount: null,
      averageWeight: null
    };
    
    // If basket is not active, return a neutral color
    if (basket.state !== 'active') {
      return {
        colorClass: 'bg-slate-100 border-slate-200',
        borderThicknessClass: 'border',
        targetSize: null,
        animalCount: null,
        averageWeight: null
      };
    }
    
    const basketOperations = getOperationsForBasket(basket.id);
    
    // Sort operations by date (newest first)
    const sortedOperations = [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get the latest operation
    const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
    
    // Calculate average weight if available
    const averageWeight = latestOperation?.animalsPerKg ? 1000000 / latestOperation.animalsPerKg : null;
    
    // Determine target size based on weight
    const targetSize = averageWeight ? getTargetSizeForWeight(averageWeight) : null;
    
    // Calculate number of animals
    const animalCount = latestOperation?.animalsPerKg ? 
      formatAnimalCount(latestOperation.animalsPerKg, averageWeight) : null;
    
    // Determine border thickness based on weight
    const borderThicknessClass = getBorderThicknessByWeight(averageWeight);
    
    // If we have a target size, use its color
    if (targetSize) {
      return {
        colorClass: `${targetSize.color} shadow-sm`,
        borderThicknessClass,
        targetSize: targetSize.code,
        animalCount,
        averageWeight
      };
    }
    
    // Otherwise, color based on days since last operation
    if (latestOperation) {
      const daysSinceLastOperation = Math.floor(
        (new Date().getTime() - new Date(latestOperation.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      let colorClass = 'bg-green-50 border-green-300';
      
      if (daysSinceLastOperation <= 7) {
        colorClass = 'bg-green-100 border-green-400 shadow-sm';
      } else if (daysSinceLastOperation <= 14) {
        colorClass = 'bg-green-50 border-green-300';
      } else if (daysSinceLastOperation <= 30) {
        colorClass = 'bg-amber-50 border-amber-300';
      } else {
        colorClass = 'bg-red-50 border-red-300';
      }
      
      return {
        colorClass,
        borderThicknessClass,
        targetSize: null,
        animalCount,
        averageWeight
      };
    }
    
    // Default for active baskets with no operations
    return {
      colorClass: 'bg-green-50 border-green-300',
      borderThicknessClass: 'border',
      targetSize: null,
      animalCount: null,
      averageWeight: null
    };
  };
  
  // Helper function to check if a basket has a large size (TP-3000 or higher)
  const hasLargeSize = (basket: Basket | undefined): boolean => {
    if (!basket || basket.state !== 'active') return false;
    
    const basketOperations = getOperationsForBasket(basket.id);
    const sortedOperations = [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
    if (!latestOperation?.animalsPerKg) return false;
    
    // Determina se è una taglia grande basandosi sul numero di animali per kg
    // La taglia TP-3000 o superiore ha animalsPerKg <= 32000
    return latestOperation.animalsPerKg <= 32000;
  };
  
  // Helper function to get the color class for a basket (backward compatibility)
  const getBasketColorClass = (basket: Basket | undefined): string => {
    return getBasketDisplayData(basket).colorClass;
  };

  // Helper function to render tooltip content
  const renderTooltipContent = (basket: Basket | undefined) => {
    if (!basket) return <div>Posizione vuota</div>;
    
    const basketOperations = getOperationsForBasket(basket.id);
    const cycle = getCycleForBasket(basket.id);
    
    // Sort operations by date (newest first)
    const sortedOperations = [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get the latest operation
    const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
    
    // Calculate average weight if available for the latest operation
    const currentAverageWeight = latestOperation?.animalsPerKg ? Math.round(1000000 / latestOperation.animalsPerKg) : null;
    
    // Determine target size based on weight
    const targetSize = currentAverageWeight ? getTargetSizeForWeight(currentAverageWeight) : null;
    
    // Get growth performance data
    let growthPerformanceData = null;
    
    // We need at least 2 measurement operations to calculate growth
    const measurementOperations = sortedOperations.filter(op => 
      op.type === 'misura' && op.animalsPerKg !== null && op.animalsPerKg > 0
    );
    
    if (measurementOperations.length >= 2) {
      // Get the two most recent measurement operations
      const currentMeasurement = measurementOperations[0];
      const previousMeasurement = measurementOperations[1];
      
      // Calculate weights
      const currentWeight = currentMeasurement.animalsPerKg ? Math.round(1000000 / currentMeasurement.animalsPerKg) : null;
      const previousWeight = previousMeasurement.animalsPerKg ? Math.round(1000000 / previousMeasurement.animalsPerKg) : null;
      
      if (currentWeight && previousWeight) {
        // Calculate days between measurements
        const daysBetweenMeasurements = differenceInDays(
          new Date(currentMeasurement.date),
          new Date(previousMeasurement.date)
        );
        
        if (daysBetweenMeasurements > 0) {
          // Calculate actual growth percentage
          const actualGrowthPercent = calculateActualGrowth(currentWeight, previousWeight);
          
          // Calculate theoretical growth based on SGR
          const theoreticalGrowth = calculateTheoreticalGrowth(
            new Date(previousMeasurement.date),
            daysBetweenMeasurements
          );
          
          if (theoreticalGrowth) {
            growthPerformanceData = {
              actualGrowthPercent,
              targetGrowthPercent: theoreticalGrowth.theoreticalGrowthPercent,
              daysBetweenMeasurements,
              currentAverageWeight: currentWeight,
              previousAverageWeight: previousWeight,
              sgrMonth: theoreticalGrowth.sgrMonth,
              sgrDailyPercentage: theoreticalGrowth.sgrDailyPercentage
            };
          }
        }
      }
    }
    
    return (
      <div className="w-64 p-2">
        <div className="font-bold text-lg mb-1">Cestello #{basket.physicalNumber}</div>
        <div className="text-sm mb-2">
          <span className="text-muted-foreground">Stato: </span>
          <span className="font-medium">{basket.state === 'active' ? 'Attivo' : 'Disponibile'}</span>
        </div>
        
        {cycle && (
          <div className="text-sm mb-2">
            <span className="text-muted-foreground">Ciclo: </span>
            <span className="font-medium">#{cycle.id}</span>
            <div className="text-xs text-muted-foreground">
              Inizio: {format(new Date(cycle.startDate), 'dd/MM/yyyy')}
            </div>
          </div>
        )}
        
        {latestOperation && (
          <>
            <div className="text-sm mb-1">
              <span className="text-muted-foreground">Ultima op.: </span>
              <span className="font-medium">{getOperationTypeLabel(latestOperation.type)}</span>
              <div className="text-xs text-muted-foreground">
                Data: {format(new Date(latestOperation.date), 'dd/MM/yyyy')}
              </div>
            </div>
            
            {latestOperation.animalsPerKg && (
              <div className="text-sm mb-2">
                <span className="text-muted-foreground">Peso medio: </span>
                <span className="font-medium">{currentAverageWeight} mg</span>
                {targetSize && (
                  <div className="text-xs font-medium mt-1">
                    Taglia target: <span className="font-bold">{targetSize.code}</span> ({targetSize.name})
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {/* Growth Performance Indicator */}
        {growthPerformanceData && (
          <div className="mt-2">
            <div className="text-sm font-medium mb-1">Performance di crescita:</div>
            <GrowthPerformanceIndicator
              actualGrowthPercent={growthPerformanceData.actualGrowthPercent}
              targetGrowthPercent={growthPerformanceData.targetGrowthPercent}
              daysBetweenMeasurements={growthPerformanceData.daysBetweenMeasurements}
              currentAverageWeight={growthPerformanceData.currentAverageWeight}
              previousAverageWeight={growthPerformanceData.previousAverageWeight}
              sgrMonth={growthPerformanceData.sgrMonth}
              sgrDailyPercentage={growthPerformanceData.sgrDailyPercentage}
            />
          </div>
        )}
      </div>
    );
  };
  
  // Event handler for basket click
  const handleBasketClick = (basket: Basket) => {
    if (!basket) return;
    
    if (basket.state === 'active' && basket.currentCycleId) {
      // Se il cestello è attivo, naviga alla pagina di dettaglio del ciclo corrente
      navigate(`/cycles/${basket.currentCycleId}`);
    } else {
      // Se il cestello è disponibile, trova l'ultimo ciclo chiuso associato a questo cestello
      const basketCycles = cycles?.filter(cycle => cycle.basketId === basket.id) || [];
      const latestCycle = basketCycles.length > 0 
        ? basketCycles.sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )[0] 
        : null;
      
      if (latestCycle) {
        // Se esiste un ciclo chiuso, naviga a quel ciclo
        navigate(`/cycles/${latestCycle.id}`);
      } else {
        // Se non ci sono cicli per questo cestello, mostra la lista dei cestelli
        navigate('/baskets');
      }
    }
  };

  // Render a single FLUPSY view
  const renderFlupsyGrid = (flupsyId: number) => {
    const flupsy = flupsys?.find(f => f.id === flupsyId);
    if (!flupsy || !baskets) return null;
    
    // Get baskets for this specific FLUPSY
    const flupsyBaskets = baskets.filter(b => b.flupsyId === flupsyId);
    const flupsyDxRow = flupsyBaskets.filter(b => b.row === 'DX');
    const flupsySxRow = flupsyBaskets.filter(b => b.row === 'SX');
    const flupsyNoRowAssigned = flupsyBaskets.filter(b => b.row === null || b.row === undefined);
    
    // Calculate max positions for this FLUPSY
    const flupsyMaxPositions = Math.max(
      ...flupsyBaskets
        .filter(b => b.position !== null && b.position !== undefined)
        .map(b => b.position || 0),
      10 // Minimum of 10 positions
    );
    
    // Helper to get basket by position for this FLUPSY
    const getFlupsyBasketByPosition = (row: 'DX' | 'SX', position: number): Basket | undefined => {
      if (row === 'DX') {
        return flupsyDxRow.find(b => b.position === position);
      }
      return flupsySxRow.find(b => b.position === position);
    };
    
    return (
      <div key={flupsyId} className="border rounded-lg p-4 relative mb-8">
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium text-base">{flupsy.name}</div>
          <Badge variant="outline" className="absolute right-2 top-2">
            Cestelli: {flupsyBaskets.length}
          </Badge>
        </div>
        
        <div className="relative pt-6">
          {/* Propeller indicator positioned at the left side */}
          <div className="relative mb-4">
            <div className="bg-blue-500 w-12 h-12 rounded-full absolute -left-6 -top-6 flex items-center justify-center text-white">
              <span className="text-xs font-semibold">Elica</span>
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            {/* DX row (Right row) */}
            <div>
              <div className="flex items-center mb-1">
                <Badge variant="secondary" className="mr-2">Fila DX</Badge>
                <Separator className="flex-grow" />
              </div>
              
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                  const position = i + 1;
                  const basket = getFlupsyBasketByPosition('DX', position);
                  const basketData = basket ? getBasketDisplayData(basket) : null;
                  const isLargeSize = hasLargeSize(basket);
                  
                  // Create a conditional style for the border color
                  let borderStyle = {};
                  if (isLargeSize) {
                    borderStyle = { 
                      borderColor: 'rgb(239, 68, 68)', // red-500
                      borderStyle: 'solid' 
                    };
                  }
                  
                  return (
                    <TooltipProvider key={`${flupsyId}-dx-${position}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            onClick={basket ? () => handleBasketClick(basket) : undefined}
                            className={`rounded-md p-2 text-center text-xs ${
                              basket ? basketData?.colorClass || 'bg-gray-50 border-dashed' : 'bg-gray-50 border-dashed'
                            } ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : 'min-h-[4.5rem]'} 
                            ${basket && basket.currentCycleId ? basketData?.borderThicknessClass || 'border' : 'border'}`}
                            style={borderStyle}
                          >
                            <div>Pos. {position}</div>
                            {basket && (
                              <div className="font-semibold mt-1">
                                #{basket.physicalNumber}
                                {basket.currentCycleId && (
                                  <>
                                    <div className="text-[10px] bg-blue-100 rounded px-1 mt-1">
                                      Ciclo {basket.currentCycleId}
                                    </div>
                                    {basketData?.targetSize && (
                                      <div className="text-[11px] font-bold mt-1">
                                        {basketData.targetSize}
                                      </div>
                                    )}
                                    {basketData?.animalCount && (
                                      <div className="text-[10px] mt-1 bg-gray-100 rounded-full px-1">
                                        {basketData.animalCount} animali
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="z-50">
                          {renderTooltipContent(basket)}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
            
            {/* SX row (Left row) */}
            <div>
              <div className="flex items-center mb-1">
                <Badge variant="secondary" className="mr-2">Fila SX</Badge>
                <Separator className="flex-grow" />
              </div>
              
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                  const position = i + 1;
                  const basket = getFlupsyBasketByPosition('SX', position);
                  const basketData = basket ? getBasketDisplayData(basket) : null;
                  const isLargeSize = hasLargeSize(basket);
                  
                  // Create a conditional style for the border color
                  let borderStyle = {};
                  if (isLargeSize) {
                    borderStyle = { 
                      borderColor: 'rgb(239, 68, 68)', // red-500
                      borderStyle: 'solid' 
                    };
                  }
                  
                  return (
                    <TooltipProvider key={`${flupsyId}-sx-${position}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            onClick={basket ? () => handleBasketClick(basket) : undefined}
                            className={`rounded-md p-2 text-center text-xs ${
                              basket ? basketData?.colorClass || 'bg-gray-50 border-dashed' : 'bg-gray-50 border-dashed'
                            } ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : 'min-h-[4.5rem]'} 
                            ${basket && basket.currentCycleId ? basketData?.borderThicknessClass || 'border' : 'border'}`}
                            style={borderStyle}
                          >
                            <div>Pos. {position}</div>
                            {basket && (
                              <div className="font-semibold mt-1">
                                #{basket.physicalNumber}
                                {basket.currentCycleId && (
                                  <>
                                    <div className="text-[10px] bg-blue-100 rounded px-1 mt-1">
                                      Ciclo {basket.currentCycleId}
                                    </div>
                                    {basketData?.targetSize && (
                                      <div className="text-[11px] font-bold mt-1">
                                        {basketData.targetSize}
                                      </div>
                                    )}
                                    {basketData?.animalCount && (
                                      <div className="text-[10px] mt-1 bg-gray-100 rounded-full px-1">
                                        {basketData.animalCount} animali
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="z-50">
                          {renderTooltipContent(basket)}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
            
            {/* No row assigned */}
            {flupsyNoRowAssigned.length > 0 && (
              <div>
                <div className="flex items-center mb-1">
                  <Badge variant="secondary" className="mr-2">Cestelli non assegnati</Badge>
                  <Separator className="flex-grow" />
                </div>
                
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {flupsyNoRowAssigned.map(basket => {
                    const basketData = basket ? getBasketDisplayData(basket) : null;
                    const isLargeSize = hasLargeSize(basket);
                    
                    // Create a conditional style for the border color
                    let borderStyle = {};
                    if (isLargeSize) {
                      borderStyle = { 
                        borderColor: 'rgb(239, 68, 68)', // red-500
                        borderStyle: 'solid' 
                      };
                    }
                    
                    return (
                      <TooltipProvider key={`${flupsyId}-norow-${basket.id}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              onClick={() => handleBasketClick(basket)}
                              className={`rounded-md p-2 text-center text-xs ${
                                basketData?.colorClass || 'bg-gray-50 border-dashed'
                              } cursor-pointer hover:shadow-md transition-shadow
                              ${basket.currentCycleId ? basketData?.borderThicknessClass || 'border' : 'border'}`}
                              style={borderStyle}
                            >
                              <div>Non posizionato</div>
                              <div className="font-semibold mt-1">
                                #{basket.physicalNumber}
                                {basket.currentCycleId && (
                                  <>
                                    <div className="text-[10px] bg-blue-100 rounded px-1 mt-1">
                                      Ciclo {basket.currentCycleId}
                                    </div>
                                    {basketData?.targetSize && (
                                      <div className="text-[11px] font-bold mt-1">
                                        {basketData.targetSize}
                                      </div>
                                    )}
                                    {basketData?.animalCount && (
                                      <div className="text-[10px] mt-1 bg-gray-100 rounded-full px-1">
                                        {basketData.animalCount} animali
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center" className="z-50">
                            {renderTooltipContent(basket)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderFlupsyGrids = () => {
    if (isLoadingFlupsys || isLoadingBaskets) {
      return <div className="py-8 text-center">Caricamento dati FLUPSY...</div>;
    }
    
    if (!flupsys || flupsys.length === 0) {
      return <div className="py-8 text-center">Nessuna unità FLUPSY configurata</div>;
    }
    
    if (activeFlupsyId) {
      // Render only the selected FLUPSY
      return renderFlupsyGrid(activeFlupsyId);
    }
    
    // Render all selected FLUPSYs
    return (
      <div className="space-y-8">
        {selectedFlupsyIds.map(flupsyId => renderFlupsyGrid(flupsyId))}
      </div>
    );
  };
  
  return (
    <div className="mb-8">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Visualizzazione FLUPSY</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => setShowFlupsySelector(!showFlupsySelector)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Disposizione delle ceste all'interno dell'unità FLUPSY
          </CardDescription>
        </CardHeader>
        
        {showFlupsySelector && (
          <CardContent className="pt-0 pb-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Unità FLUPSY selezionate ({selectedFlupsyIds.length}):</div>
              <div className="flex flex-wrap gap-2">
                {flupsys?.map(flupsy => (
                  <Badge
                    key={flupsy.id}
                    variant={selectedFlupsyIds.includes(flupsy.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFlupsySelection(flupsy.id)}
                  >
                    {selectedFlupsyIds.includes(flupsy.id) ? (
                      <CheckSquare className="mr-1 h-3 w-3" />
                    ) : (
                      <Square className="mr-1 h-3 w-3" />
                    )}
                    {flupsy.name}
                  </Badge>
                ))}
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllFlupsys}
                  disabled={!flupsys || flupsys.length === 0 || (flupsys && selectedFlupsyIds.length === flupsys.length)}
                >
                  Seleziona tutti
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deselectAllFlupsys}
                  disabled={selectedFlupsyIds.length === 0}
                >
                  Deseleziona tutti
                </Button>
              </div>
            </div>
          </CardContent>
        )}
        
        <CardContent>
          <div className="mb-4">
            <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="mb-2 w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">Tutti i FLUPSY ({selectedFlupsyIds.length})</TabsTrigger>
                {flupsys?.filter(f => selectedFlupsyIds.includes(f.id)).map(flupsy => (
                  <TabsTrigger key={flupsy.id} value={flupsy.id.toString()}>
                    {flupsy.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value="all">
                <div className="text-sm mb-2">
                  {selectedFlupsyIds.length > 0 ? (
                    <div>Visualizzazione di {selectedFlupsyIds.length} unità FLUPSY</div>
                  ) : (
                    <div>Nessuna unità FLUPSY selezionata</div>
                  )}
                </div>
                {renderFlupsyGrids()}
              </TabsContent>
              
              {flupsys?.map(flupsy => (
                <TabsContent key={flupsy.id} value={flupsy.id.toString()}>
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">Posizione: </span>
                    <span className="font-medium">{flupsy.location || "Non specificata"}</span>
                  </div>
                  {renderFlupsyGrids()}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}