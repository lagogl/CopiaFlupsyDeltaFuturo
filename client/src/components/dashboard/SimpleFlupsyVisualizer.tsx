import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Fan } from 'lucide-react';
import { getOperationTypeLabel, getSizeFromAnimalsPerKg } from '@/lib/utils';

interface SimpleFlupsyVisualizerProps {
  selectedFlupsyIds?: number[];
}

export default function SimpleFlupsyVisualizer({ selectedFlupsyIds = [] }: SimpleFlupsyVisualizerProps) {
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState<string>("all");

  // Fetch flupsys
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys', { includeAll: true }],
  });

  // Fetch ALL baskets without any filters
  const { data: allBaskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets', { includeAll: true }],
  });

  // Filter baskets client-side based on selectedFlupsyIds
  const filteredBaskets = useMemo(() => {
    if (!allBaskets) return [];

    // If no flupsyIds are selected, show all baskets
    if (selectedFlupsyIds.length === 0) {
      return allBaskets;
    }

    // Otherwise, filter baskets to only show those in the selected FLUPSYs
    return allBaskets.filter((basket: any) => selectedFlupsyIds.includes(basket.flupsyId));
  }, [allBaskets, selectedFlupsyIds]);

  // Fetch operations for tooltip data - usando /api/operations per ottenere tutti i dati
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations', { includeAll: true, pageSize: 1000 }],
    staleTime: 30000, // 30 seconds
  });

  // Fetch cycles for tooltip data
  const { data: cycles, isLoading: isLoadingCycles } = useQuery({
    queryKey: ['/api/cycles', { includeAll: true }],
    staleTime: 30000, // 30 seconds
  });

  // Fetch lots for tooltip data
  const { data: lots, isLoading: isLoadingLots } = useQuery({
    queryKey: ['/api/lots', { includeAll: true }],
    staleTime: 30000, // 30 seconds
  });

  // Fetch sizes for tooltip data
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
    staleTime: 3600000, // 1 hour - le taglie cambiano raramente
  });

  // Debug logging
  React.useEffect(() => {
    if (filteredBaskets) {
      console.log(`SimpleFlupsyVisualizer: Filtered ${filteredBaskets.length} baskets`);
      // Group by FLUPSY
      const basketsByFlupsy = filteredBaskets.reduce((acc: any, basket: any) => {
        acc[basket.flupsyId] = (acc[basket.flupsyId] || 0) + 1;
        return acc;
      }, {});
      console.log('Distribution by FLUPSY:', basketsByFlupsy);
    }
  }, [filteredBaskets]);

  // Helper function to get the latest operation for a basket
  const getLatestOperation = (basketId: number) => {
    if (!operations || !Array.isArray(operations)) {
      console.log('Operations not available or not an array', operations);
      return null;
    }

    // Add debugging output
    console.log(`Looking for operations for basket ${basketId} among ${operations.length} operations`);
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    console.log(`Found ${basketOperations.length} operations for basket ${basketId}`);
    
    if (basketOperations.length === 0) return null;

    // Sort by date descending and take the first one
    const latestOp = basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    
    console.log(`Latest operation for basket ${basketId}:`, latestOp);
    return latestOp;
  };

  // Helper function to get operations for a basket
  const getOperationsForBasket = (basketId: number): any[] => {
    if (!operations || !Array.isArray(operations)) return [];
    return operations.filter((op: any) => op.basketId === basketId);
  };
  
  // Helper function to check if a basket has a large size (TP-3000 or higher)
  const hasLargeSize = (basket: any): boolean => {
    if (!basket || basket.state !== 'active') return false;
    
    const basketOperations = getOperationsForBasket(basket.id);
    const sortedOperations = [...basketOperations].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
    if (!latestOperation?.animalsPerKg) return false;
    
    // Determina se è una taglia grande basandosi sul numero di animali per kg
    // La taglia TP-3000 o superiore ha animalsPerKg <= 3000
    return latestOperation.animalsPerKg <= 3000;
  };
  
  // Helper function to get size code from the sizes table based on animalsPerKg
  const getSizeCodeFromAnimalsPerKg = (animalsPerKg: number): string => {
    if (!sizes || !Array.isArray(sizes)) return 'N/D';
    
    // Trova la taglia corrispondente in base al range min_animals_per_kg e max_animals_per_kg
    const matchingSize = sizes.find((size: any) => {
      // Se il numero di animali per kg rientra nel range di questa taglia
      return (
        (!size.minAnimalsPerKg || animalsPerKg >= size.minAnimalsPerKg) &&
        (!size.maxAnimalsPerKg || animalsPerKg <= size.maxAnimalsPerKg)
      );
    });
    
    // Se troviamo una taglia corrispondente, restituisci il suo codice
    if (matchingSize) {
      return matchingSize.code;
    }
    
    // Fallback se non troviamo una taglia corrispondente
    return `TP-${Math.round(animalsPerKg/1000)*1000}`;
  };

  // Helper function to get basket color class based on size
  const getBasketColorClass = (basket: any) => {
    if (!basket) return 'bg-gray-50 border-dashed';
    
    // If basket is not active, return a neutral color
    if (basket.state !== 'active') {
      return 'bg-slate-100 border-slate-200';
    }
    
    const basketOperations = getOperationsForBasket(basket.id);
    const sortedOperations = [...basketOperations].sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Get the most recent operation
    const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
    
    if (!latestOperation) {
      // Basket is active but has no operations
      return 'bg-blue-50 border-blue-300';
    }
    
    // Check if we have a valid animalsPerKg value
    if (!latestOperation.animalsPerKg) {
      return 'bg-blue-50 border-blue-300';
    }
    
    // Get size from database if available
    if (latestOperation.sizeId && sizes && Array.isArray(sizes)) {
      const size = sizes.find((s: any) => s.id === latestOperation.sizeId);
      if (size) {
        // Personalizza i colori in base ai codici taglia dell'immagine di riferimento
        if (size.code === 'TP-500') return 'bg-red-50 border-red-500 border-2';
        if (size.code === 'TP-1000') return 'bg-orange-50 border-orange-500 border-2';
        if (size.code === 'TP-1500') return 'bg-amber-50 border-amber-500 border-2';
        if (size.code === 'TP-2000') return 'bg-yellow-50 border-yellow-500 border-2';
        if (size.code === 'TP-3000') return 'bg-lime-50 border-lime-500 border-2';
        if (size.code === 'TP-6000') return 'bg-green-50 border-green-500 border-2';
        if (size.code === 'TP-10000') return 'bg-teal-50 border-teal-500 border-2';
        if (size.code === 'TP-20000') return 'bg-sky-50 border-sky-500 border-2';
      }
    }
    
    // Fallback based on animalsPerKg if no size found
    const apkg = latestOperation.animalsPerKg;
    
    // Colori specificati nell'immagine di riferimento
    if (apkg <= 500) {
      return 'bg-red-50 border-red-500 border-2'; // Taglia molto grande (pochi animali per kg)
    } else if (apkg <= 1000) {
      return 'bg-orange-50 border-orange-500 border-2';
    } else if (apkg <= 1500) {
      return 'bg-amber-50 border-amber-500 border-2';
    } else if (apkg <= 2000) {
      return 'bg-yellow-50 border-yellow-500 border-2';
    } else if (apkg <= 3000) {
      return 'bg-lime-50 border-lime-500 border-2';
    } else if (apkg <= 6000) {
      return 'bg-green-50 border-green-500 border-2';
    } else if (apkg <= 10000) {
      return 'bg-teal-50 border-teal-500 border-2';
    } else if (apkg <= 20000) {
      return 'bg-sky-50 border-sky-500 border-2';
    } else {
      return 'bg-blue-50 border-blue-500 border-2'; // Taglia molto piccola (molti animali per kg)
    }
  };

  // Handle basket click to navigate to basket detail
  const handleBasketClick = (basket: any) => {
    navigate(`/baskets/${basket.id}`);
  };

  // Render a basket position within a FLUPSY
  const renderBasketPosition = (flupsyId: number, row: 'DX' | 'SX', position: number) => {
    // Find the basket at this position in this FLUPSY
    const basket = filteredBaskets?.find((b: any) => 
      b.flupsyId === flupsyId && 
      b.row === row && 
      b.position === position
    );

    // Log per la diagnostica dei dati del cestello trovato
    if (basket) {
      console.log(`Found basket at ${flupsyId}:${row}-${position}:`, basket);
    }

    // Get the latest operation for tooltip info
    const latestOperation = basket ? getLatestOperation(basket.id) : null;

    return (
      <TooltipProvider key={`${flupsyId}-${row}-${position}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              onClick={basket ? () => handleBasketClick(basket) : undefined}
              className={`border rounded-md p-2 text-center text-xs ${
                basket ? getBasketColorClass(basket) : 'bg-gray-50 border-dashed'
              } ${basket ? 'cursor-pointer hover:shadow-md transition-shadow' : 'min-h-[3.5rem]'}`}
            >
              <div className="text-[10px] text-gray-500">CESTA #{basket?.physicalNumber || position}</div>
              {basket && latestOperation && (
                <>
                  {/* Taglia come nell'immagine di riferimento */}
                  <div className="font-bold mt-1">
                    {latestOperation.animalsPerKg && getSizeCodeFromAnimalsPerKg(latestOperation.animalsPerKg)}
                  </div>
                  
                  {/* Ciclo attivo */}
                  {basket.currentCycleId && (
                    <div className="text-[10px] text-gray-600 mt-1">
                      Ciclo {basket.currentCycleId}
                    </div>
                  )}
                  
                  {/* Peso totale */}
                  <div className="text-[10px] text-gray-500 mt-1">
                    {latestOperation.totalWeight && 
                      `${latestOperation.totalWeight.toLocaleString('it-IT')}kg`}
                  </div>
                  
                  {/* Numero animali */}
                  <div className="text-[10px] text-gray-500">
                    {latestOperation.animalCount && 
                      `${latestOperation.animalCount.toLocaleString('it-IT')} animali`}
                  </div>
                  
                  {/* Data dell'operazione */}
                  <div className="text-[10px] text-gray-500 mt-1">
                    {format(new Date(latestOperation.date), 'dd/MM/yy')}
                  </div>
                </>
              )}
            </div>
          </TooltipTrigger>
          
          {basket && latestOperation && (
            <TooltipContent side="top" className="w-64 p-3">
              <div className="space-y-2">
                <div className="flex justify-between font-bold">
                  <span>Cesta #{basket.physicalNumber}</span>
                  <span>ID: {basket.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Ultima operazione:</span>
                  <span>{getOperationTypeLabel(latestOperation.type)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Data:</span>
                  <span>{format(new Date(latestOperation.date), 'dd/MM/yyyy')}</span>
                </div>
                
                {/* Mostra sempre la taglia nel tooltip */}
                <div className="flex justify-between">
                  <span className="font-medium">Taglia:</span>
                  <span className="font-semibold">
                    {latestOperation.animalsPerKg ? 
                      getSizeCodeFromAnimalsPerKg(latestOperation.animalsPerKg) : 'N/D'}
                  </span>
                </div>
                
                {latestOperation.animalsPerKg && (
                  <div className="flex justify-between">
                    <span className="font-medium">Densità:</span>
                    <span>{latestOperation.animalsPerKg.toLocaleString('it-IT')} animali/kg</span>
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
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Function to render a single FLUPSY
  const renderFlupsy = (flupsy: any) => {
    const flupsyDxRow = filteredBaskets?.filter((b: any) => 
      b.flupsyId === flupsy.id && 
      b.row === 'DX'
    ) || [];
    
    const flupsySxRow = filteredBaskets?.filter((b: any) => 
      b.flupsyId === flupsy.id && 
      b.row === 'SX'
    ) || [];
    
    const flupsyBaskets = [...flupsyDxRow, ...flupsySxRow];
    
    // Estrai il valore max_positions dal database
    // Poiché le proprietà dei dati dall'API potrebbero variare il formato, controlliamo tutte le possibili varianti
    const maxPositionsFromDB = flupsy.max_positions || flupsy.maxPositions || flupsy.maxPosition || flupsy["max-positions"];
    
    // Se non riusciamo a trovare il valore dal database, usiamo un fallback
    const maxPositions = maxPositionsFromDB || Math.max(
      ...flupsyBaskets.map((b: any) => b.position || 0),
      10
    );
    
    console.log(`FLUPSY ${flupsy.id} - ${flupsy.name}: max_positions = ${maxPositionsFromDB}`, flupsy);
    
    // Il numero di posizioni deve essere esattamente la metà del valore max_positions per ogni fila
    const positionsPerRow = Math.floor(maxPositions / 2);
    
    // Se il valore è dispari, aggiungiamo una posizione in più alla fila DX (per arrotondare)
    const dxPositions = maxPositions % 2 === 0 ? positionsPerRow : positionsPerRow + 1;
    const sxPositions = positionsPerRow;

    return (
      <div key={`flupsy-${flupsy.id}`} className="mb-8 border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{flupsy.name}</h3>
          <Badge variant="outline">{flupsy.location}</Badge>
        </div>
        
        <div className="relative pt-6">
          {/* Propeller indicator */}
          <div className="relative mb-4 flex justify-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-blue-700 border-2 border-blue-300">
              <Fan className="w-10 h-10 animate-spin-slow" />
            </div>
          </div>
          
          <div className="space-y-4 mt-4">
            {/* DX row */}
            <div>
              <div className="flex items-center mb-1">
                <Badge variant="secondary" className="mr-2">Fila DX</Badge>
                <Separator className="flex-grow" />
              </div>
              
              <div className="flex flex-row flex-wrap gap-2 overflow-x-auto">
                {Array.from({ length: dxPositions }).map((_, i) => 
                  renderBasketPosition(flupsy.id, 'DX', i + 1)
                )}
              </div>
            </div>
            
            {/* SX row */}
            <div>
              <div className="flex items-center mb-1">
                <Badge variant="secondary" className="mr-2">Fila SX</Badge>
                <Separator className="flex-grow" />
              </div>
              
              <div className="flex flex-row flex-wrap gap-2 overflow-x-auto">
                {Array.from({ length: sxPositions }).map((_, i) => 
                  renderBasketPosition(flupsy.id, 'SX', i + 1)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingFlupsys || isLoadingBaskets || isLoadingOperations || isLoadingCycles || isLoadingLots) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visualizzazione FLUPSY</CardTitle>
          <CardDescription>Caricamento dati in corso...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-10 w-1/2 bg-gray-200 rounded mb-4"></div>
              <div className="h-40 w-full bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const effectiveFlupsys = flupsys?.filter((flupsy: any) => 
    selectedFlupsyIds.length === 0 || selectedFlupsyIds.includes(flupsy.id)
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Disposizione delle ceste attive con cicli
        </CardDescription>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4 mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Tutti i FLUPSY ({effectiveFlupsys?.length || 0})
            </TabsTrigger>
            
            {effectiveFlupsys?.map((flupsy: any) => (
              <TabsTrigger key={flupsy.id} value={flupsy.id.toString()} className="flex-1">
                {flupsy.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {selectedTab === "all" ? (
          // Show all selected FLUPSYs
          <div className="space-y-8">
            {effectiveFlupsys?.map((flupsy: any) => (
              <div key={flupsy.id}>
                {renderFlupsy(flupsy)}
                {flupsy.id !== effectiveFlupsys[effectiveFlupsys.length - 1].id && (
                  <Separator className="my-4" />
                )}
              </div>
            ))}
          </div>
        ) : (
          // Show only the selected tab's FLUPSY
          <div>
            {renderFlupsy(effectiveFlupsys?.find((f: any) => f.id === parseInt(selectedTab)))}
          </div>
        )}
        
        {effectiveFlupsys?.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500">Nessun FLUPSY selezionato. Usa il filtro qui sopra per visualizzare alcuni FLUPSY.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}