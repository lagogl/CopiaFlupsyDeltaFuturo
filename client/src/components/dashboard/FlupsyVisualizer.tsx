import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
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
  getBasketColorBySize
} from '@/lib/utils';
import { CheckSquare, Square, Filter, Eye } from 'lucide-react';

export default function FlupsyVisualizer() {
  const isMobile = useIsMobile();
  const [, navigate] = useLocation();
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [showFlupsySelector, setShowFlupsySelector] = useState<boolean>(false);
  
  // Fetch flupsys
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  // Fetch baskets
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  // Fetch operations
  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  // Fetch cycles
  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles'],
  });
  
  // Select all FLUPSYs by default
  if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
    setSelectedFlupsyIds(flupsys.map((f: any) => f.id));
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
    setSelectedFlupsyIds(flupsys.map((f: any) => f.id));
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
  const selectedFlupsy = activeFlupsyId ? flupsys?.find((f: any) => f.id === activeFlupsyId) : null;
  
  // Filter baskets by selected FLUPSYs
  const filteredBaskets = baskets ? 
    (activeFlupsyId ? 
      baskets.filter((b: any) => b.flupsyId === activeFlupsyId) : 
      baskets.filter((b: any) => selectedFlupsyIds.includes(b.flupsyId))
    ) : [];
  
  // Create a grid of baskets
  const maxPositions = Math.max(
    ...filteredBaskets
      .filter((b: any) => b.position !== null && b.position !== undefined)
      .map((b: any) => b.position),
    10 // Minimum of 10 positions
  );
  
  // Group baskets by row
  const dxRow = filteredBaskets.filter((b: any) => b.row === 'DX');
  const sxRow = filteredBaskets.filter((b: any) => b.row === 'SX');
  const noRowAssigned = filteredBaskets.filter((b: any) => b.row === null || b.row === undefined);
  
  // Helper function to get basket by position for a specific row
  const getBasketByPosition = (row: 'DX' | 'SX', position: number) => {
    if (row === 'DX') {
      return dxRow.find((b: any) => b.position === position);
    }
    return sxRow.find((b: any) => b.position === position);
  };
  
  // Helper function to get cycle for a basket
  const getCycleForBasket = (basketId: number) => {
    if (!cycles) return null;
    return cycles.find((c: any) => c.basketId === basketId);
  };
  
  // Helper function to get operations for a basket
  const getOperationsForBasket = (basketId: number) => {
    if (!operations) return [];
    return operations.filter((op: any) => op.basketId === basketId);
  };
  
  // Helper function to get the color class for a basket
  const getBasketColorClass = (basket: any) => {
    if (!basket) return 'bg-gray-50 border-dashed';
    
    // If basket is not active, return a neutral color
    if (basket.state !== 'active') {
      return 'bg-slate-100 border-slate-200';
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
    
    // If we have a target size, use its color
    if (targetSize) {
      return `${targetSize.color} shadow-sm`;
    }
    
    // Otherwise, color based on days since last operation
    if (latestOperation) {
      const daysSinceLastOperation = Math.floor(
        (new Date().getTime() - new Date(latestOperation.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastOperation <= 7) {
        return 'bg-green-100 border-green-400 shadow-sm';
      } else if (daysSinceLastOperation <= 14) {
        return 'bg-green-50 border-green-300';
      } else if (daysSinceLastOperation <= 30) {
        return 'bg-amber-50 border-amber-300';
      } else {
        return 'bg-red-50 border-red-300';
      }
    }
    
    // Default color for active baskets with no operations
    return 'bg-green-50 border-green-300';
  };

  // Helper function to render tooltip content
  const renderTooltipContent = (basket: any) => {
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
    const averageWeight = latestOperation?.animalsPerKg ? Math.round(1000000 / latestOperation.animalsPerKg) : null;
    
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
          </>
        )}
      </div>
    );
  };
  
  // Event handler for basket click
  const handleBasketClick = (basket: any) => {
    if (!basket) return;
    navigate(`/baskets/${basket.id}`);
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Disposizione delle ceste all'interno dell'unità FLUPSY
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
                {flupsys && flupsys.map((flupsy: any) => (
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
                Tutti i FLUPSY ({selectedFlupsyIds.length})
              </TabsTrigger>
              
              {flupsys && selectedFlupsyIds.map((flupsyId: number) => {
                const flupsy = flupsys.find((f: any) => f.id === flupsyId);
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
        {isLoadingBaskets || isLoadingFlupsys ? (
          <div className="text-center py-4">Caricamento...</div>
        ) : selectedFlupsyIds.length > 0 ? (
          <div className="space-y-8">
            {/* FLUPSY Visualization */}
            <div className="border rounded-lg p-4 relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div>
                    {selectedTab === "all" 
                      ? "Vista combinata di tutti i FLUPSY selezionati" 
                      : `Vista lato elica (${selectedFlupsy?.name || ""})`
                    }
                  </div>
                  <a href="/flupsy-view" className="text-xs text-blue-600 hover:underline">
                    Vista dettagliata
                  </a>
                </div>
                <Badge variant="outline" className="absolute right-2 top-2">
                  Cestelli: {filteredBaskets.length}
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
                      {Array.from({ length: maxPositions }).map((_, i) => {
                        const position = i + 1;
                        const basket = getBasketByPosition('DX', position);
                        
                        return (
                          <TooltipProvider key={`dx-${position}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  onClick={basket ? () => handleBasketClick(basket) : undefined}
                                  className={`border rounded-md p-2 text-center text-xs ${
                                    basket ? getBasketColorClass(basket) : 'bg-gray-50 border-dashed'
                                  } ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                                >
                                  <div>Pos. {position}</div>
                                  {basket && (
                                    <div className="font-semibold mt-1">
                                      #{basket.physicalNumber}
                                      {basket.currentCycleId && (
                                        <div className="text-[10px] bg-blue-100 rounded px-1 mt-1">
                                          Ciclo {basket.currentCycleId}
                                        </div>
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
                      {Array.from({ length: maxPositions }).map((_, i) => {
                        const position = i + 1;
                        const basket = getBasketByPosition('SX', position);
                        
                        return (
                          <TooltipProvider key={`sx-${position}`}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  onClick={basket ? () => handleBasketClick(basket) : undefined}
                                  className={`border rounded-md p-2 text-center text-xs ${
                                    basket ? getBasketColorClass(basket) : 'bg-gray-50 border-dashed'
                                  } ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                                >
                                  <div>Pos. {position}</div>
                                  {basket && (
                                    <div className="font-semibold mt-1">
                                      #{basket.physicalNumber}
                                      {basket.currentCycleId && (
                                        <div className="text-[10px] bg-blue-100 rounded px-1 mt-1">
                                          Ciclo {basket.currentCycleId}
                                        </div>
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
                </div>
              </div>
            </div>
            
            {/* Unassigned baskets section (baskets without positions) */}
            {noRowAssigned.length > 0 && (
              <div className="border rounded-lg p-4">
                <div className="mb-2">
                  <Badge variant="destructive" className="mb-2">Cestelli senza posizione assegnata</Badge>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {noRowAssigned.map((basket: any) => (
                    <TooltipProvider key={basket.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div 
                            onClick={() => handleBasketClick(basket)}
                            className={`border rounded-md p-2 text-center text-xs ${
                              getBasketColorClass(basket)
                            } cursor-pointer hover:shadow-md transition-shadow`}
                          >
                            <div>Cesta #{basket.physicalNumber}</div>
                            <div className="mt-1 text-gray-500">
                              {basket.state === 'active' ? 'Attiva' : 'Disponibile'}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="z-50">
                          {renderTooltipContent(basket)}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">Nessuna unità FLUPSY selezionata</div>
        )}
      </CardContent>
    </Card>
  );
}