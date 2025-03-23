import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';
import { format, differenceInDays } from 'date-fns';
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
  calculateAverageWeight,
  formatAnimalCount,
} from '@/lib/utils';
import { CheckSquare, Square, Filter, Eye, Layers, TrendingUp } from 'lucide-react';

export default function FlupsyVisualizer() {
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
    deadCount: number | null;
    mortalityRate: number | null;
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
  
  // Select all FLUPSYs by default
  if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
    setSelectedFlupsyIds(flupsys.map(f => f.id));
  }
  
  // Handle FLUPSY selection/deselection
  const toggleFlupsySelection = (id: number) => {
    if (selectedFlupsyIds.includes(id)) {
      setSelectedFlupsyIds(selectedFlupsyIds.filter(fId => fId !== id));
    } else {
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
  
  // Helper function to get the latest operation for a basket
  const getLatestOperation = (basketId: number): Operation | null => {
    const basketOperations = getOperationsForBasket(basketId);
    if (basketOperations.length === 0) return null;
    
    return basketOperations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };
  
  // Helper function to check if a basket has mortality data
  const hasMortalityData = (basket: Basket | undefined): boolean => {
    if (!basket) return false;
    
    const latestOp = getLatestOperation(basket.id);
    return !!(latestOp?.deadCount && latestOp.deadCount > 0);
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
    
    // Calculate average weight if available
    const averageWeight = latestOperation?.animalsPerKg ? calculateAverageWeight(latestOperation.animalsPerKg) : null;
    
    // Determine target size based on weight
    const targetSize = averageWeight ? getTargetSizeForWeight(averageWeight) : null;
    
    return (
      <div className="w-60 p-2">
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
              <div className="text-sm">
                <span className="text-muted-foreground">Peso medio: </span>
                <span className="font-medium">{averageWeight} mg</span>
                {targetSize && (
                  <div className="text-xs font-medium mt-1">
                    Taglia target: <span className="font-bold">{targetSize.code}</span> ({targetSize.name})
                  </div>
                )}
              </div>
            )}
            
            {/* Visualizzazione dati di mortalità */}
            {latestOperation.deadCount !== null && latestOperation.deadCount > 0 && (
              <div className="text-sm mt-2 p-1 bg-red-50 border border-red-200 rounded">
                <div className="text-red-700 font-medium">Mortalità rilevata:</div>
                <div className="flex justify-between">
                  <div className="text-xs text-red-600">Animali morti: <span className="font-bold">{latestOperation.deadCount}</span></div>
                  <div className="text-xs text-red-600">Tasso: <span className="font-bold">{latestOperation.mortalityRate}%</span></div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Event handler for basket click
  const handleBasketClick = (basket: Basket) => {
    if (!basket) return;
    
    if (basket.state === 'active' && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    } else {
      const basketCycles = cycles?.filter(cycle => cycle.basketId === basket.id) || [];
      const latestCycle = basketCycles.length > 0 
        ? basketCycles.sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )[0] 
        : null;
      
      if (latestCycle) {
        navigate(`/cycles/${latestCycle.id}`);
      } else {
        navigate('/baskets');
      }
    }
  };

  // Get baskets for a specific FLUPSY
  const getBasketsForFlupsy = (flupsyId: number): Basket[] => {
    if (!baskets) return [];
    return baskets.filter(b => b.flupsyId === flupsyId);
  };

  // Get a basket by row and position in a specific FLUPSY
  const getBasketByPosition = (flupsyId: number, row: 'DX' | 'SX', position: number): Basket | undefined => {
    const flupsyBaskets = getBasketsForFlupsy(flupsyId);
    return flupsyBaskets.find(b => b.row === row && b.position === position);
  };

  // Render a basket at a specific position
  const renderBasket = (flupsyId: number, row: 'DX' | 'SX', position: number) => {
    const basket = getBasketByPosition(flupsyId, row, position);
    const latestOperation = basket ? getLatestOperation(basket.id) : null;
    
    let borderClass = 'border';
    let bgClass = 'bg-gray-50';
    
    if (basket && basket.state === 'active') {
      if (latestOperation?.animalsPerKg) {
        // Logica per il bordo in base al peso/taglia
        const avgWeight = calculateAverageWeight(latestOperation.animalsPerKg);
        
        // Colore e spessore del bordo basato sul peso
        if (avgWeight) {
          if (avgWeight >= 3000) {
            borderClass = 'border-red-500 border-4';
            bgClass = 'bg-red-50';
          } else if (avgWeight >= 1000) {
            borderClass = 'border-orange-500 border-2';
            bgClass = 'bg-orange-50';
          } else if (avgWeight >= 500) {
            borderClass = 'border-yellow-500 border-2';
            bgClass = 'bg-yellow-50';
          } else if (avgWeight >= 100) {
            borderClass = 'border-green-500 border';
            bgClass = 'bg-green-50';
          }
        }
      }
      
      // Se ci sono dati di mortalità
      if (hasMortalityData(basket)) {
        borderClass += ' ring-1 ring-red-500';
        bgClass = 'bg-red-100';
      }
    } else if (!basket) {
      borderClass = 'border border-dashed';
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={basket ? () => handleBasketClick(basket) : undefined}
              className={`${borderClass} rounded-md p-2 text-center text-xs ${bgClass} 
                ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : 'min-h-[3.5rem]'}`}
            >
              {!basket ? (
                <div>Pos. {position}</div>
              ) : (
                <>
                  <div className="font-semibold">#{basket.physicalNumber}</div>
                  {latestOperation?.animalsPerKg && (
                    <div className="mt-1 text-[10px]">
                      {calculateAverageWeight(latestOperation.animalsPerKg)} mg
                    </div>
                  )}
                  {hasMortalityData(basket) && (
                    <div className="mt-1 bg-red-200 text-red-800 rounded px-1 py-0.5 text-[9px]">
                      {latestOperation?.mortalityRate}% mort.
                    </div>
                  )}
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {renderTooltipContent(basket)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render a FLUPSY
  const renderFlupsy = (flupsyId: number) => {
    const flupsy = flupsys?.find(f => f.id === flupsyId);
    if (!flupsy) return null;
    
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{flupsy.name}</h3>
          <Badge variant="outline">{flupsy.location}</Badge>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Fila DX */}
          <div className="bg-white rounded-md p-3 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                <span>DX</span>
              </div>
              <div className="text-sm font-medium">Fila DX</div>
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => renderBasket(flupsyId, 'DX', i + 1))}
            </div>
          </div>
          
          {/* Fila SX */}
          <div className="bg-white rounded-md p-3 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                <span>SX</span>
              </div>
              <div className="text-sm font-medium">Fila SX</div>
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: 10 }, (_, i) => renderBasket(flupsyId, 'SX', i + 1))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Loading state
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
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY Avanzata</CardTitle>
        <CardDescription>
          Disposizione delle ceste all'interno dell'unità FLUPSY con dati di mortalità
        </CardDescription>
        
        <div className="pt-2">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium">Unità FLUPSY selezionate ({selectedFlupsyIds.length}):</div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFlupsySelector(!showFlupsySelector)}
              className="flex items-center gap-1"
            >
              <Filter className="h-4 w-4" />
              {showFlupsySelector ? 'Nascondi filtri' : 'Mostra filtri'}
            </Button>
          </div>
          
          {showFlupsySelector && (
            <div className="border rounded-md p-3 mb-4 bg-slate-50">
              <div className="flex justify-between items-center mb-2">
                <div className="text-sm font-medium">Seleziona FLUPSY da visualizzare:</div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllFlupsys} disabled={isLoadingFlupsys}>
                    <CheckSquare className="h-4 w-4 mr-1" /> Seleziona tutti
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllFlupsys} disabled={isLoadingFlupsys}>
                    <Square className="h-4 w-4 mr-1" /> Deseleziona tutti
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                {flupsys && flupsys.map((flupsy) => (
                  <div 
                    key={flupsy.id} 
                    className={`
                      flex items-center gap-2 p-2 rounded border 
                      ${selectedFlupsyIds.includes(flupsy.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
                      cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors
                    `}
                    onClick={() => toggleFlupsySelection(flupsy.id)}
                  >
                    <Checkbox 
                      checked={selectedFlupsyIds.includes(flupsy.id)}
                      onCheckedChange={() => toggleFlupsySelection(flupsy.id)}
                      className="mr-1"
                    />
                    <div className="flex-1 text-sm">{flupsy.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                <Layers className="h-4 w-4 mr-1" />
                Tutti i FLUPSY ({selectedFlupsyIds.length})
              </TabsTrigger>
              
              {flupsys && selectedFlupsyIds.map((flupsyId) => {
                const flupsy = flupsys.find(f => f.id === flupsyId);
                if (!flupsy) return null;
                
                return (
                  <TabsTrigger key={flupsyId} value={flupsyId.toString()} className="flex-1">
                    {flupsy.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent>
        <TabsContent value="all">
          {flupsys && selectedFlupsyIds.map((flupsyId) => (
            <div key={flupsyId}>
              {renderFlupsy(flupsyId)}
              {flupsyId !== selectedFlupsyIds[selectedFlupsyIds.length - 1] && <Separator className="my-4" />}
            </div>
          ))}
        </TabsContent>
        
        {flupsys && flupsys.map((flupsy) => (
          <TabsContent key={flupsy.id} value={flupsy.id.toString()}>
            {renderFlupsy(flupsy.id)}
          </TabsContent>
        ))}
      </CardContent>
    </Card>
  );
}