import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Fan } from 'lucide-react';
import { getOperationTypeLabel } from '@/lib/utils';

interface NewFlupsyVisualizerProps {
  selectedFlupsyIds?: number[];
}

export default function NewFlupsyVisualizer({ selectedFlupsyIds = [] }: NewFlupsyVisualizerProps) {
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

  // Fetch operations for tooltip data
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

  // Helper function to get the latest operation for a basket
  const getLatestOperation = (basketId: number) => {
    if (!operations || !Array.isArray(operations)) return null;
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    if (basketOperations.length === 0) return null;

    // Sort by date descending and take the first one
    return basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };

  // Helper function to get operations for a basket
  const getOperationsForBasket = (basketId: number): any[] => {
    if (!operations || !Array.isArray(operations)) return [];
    return operations.filter((op: any) => op.basketId === basketId);
  };
  
  // Helper function to check if a basket has a large size (TP-3000 or higher)
  const hasLargeSize = (basket: any): boolean => {
    if (!basket || basket.state !== 'active') return false;
    
    const latestOperation = getLatestOperation(basket.id);
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
    if (!basket) return 'bg-gray-100 border-dashed border-gray-300';
    
    // If basket is not active, return a neutral color
    if (basket.state !== 'active') {
      return 'bg-gray-100 border-gray-300';
    }
    
    const latestOperation = getLatestOperation(basket.id);
    
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
        if (size.code.includes('TP-800')) return 'bg-red-50 border-red-500';
        if (size.code.includes('TP-1000') || size.code.includes('TP-1140')) return 'bg-orange-50 border-orange-500';
        if (size.code.includes('TP-1500')) return 'bg-lime-50 border-lime-500';
        if (size.code.includes('TP-2000')) return 'bg-yellow-50 border-yellow-500';
        if (size.code.includes('TP-3000')) return 'bg-teal-50 border-teal-500';
        if (size.code.includes('TP-4000') || size.code.includes('TP-5000')) return 'bg-blue-50 border-blue-500';
        if (size.code.includes('TP-6000')) return 'bg-green-50 border-green-500';
      }
    }
    
    // Fallback based on animalsPerKg if no size found
    const apkg = latestOperation.animalsPerKg;
    
    // Colori specificati nell'immagine di riferimento
    if (apkg <= 800) {
      return 'bg-red-50 border-red-500'; // Pre-ingresso iniziale
    } else if (apkg <= 1140) {
      return 'bg-orange-50 border-orange-500'; // Pre-ingresso avanzato
    } else if (apkg <= 1500) {
      return 'bg-lime-50 border-lime-500'; // Ingresso iniziale
    } else if (apkg <= 2000) {
      return 'bg-yellow-50 border-yellow-500'; // Ingresso avanzato
    } else if (apkg <= 3000) {
      return 'bg-teal-50 border-teal-500'; // Pre-vendita
    } else if (apkg <= 5000) {
      return 'bg-blue-50 border-blue-500'; // Commerciale
    } else {
      return 'bg-green-50 border-green-500'; // Commerciale grande
    }
  };

  // Handle basket click to navigate to basket detail
  const handleBasketClick = (basket: any) => {
    navigate(`/baskets/${basket.id}`);
  };

  // Render a basket position within a FLUPSY
  const renderBasketPosition = (flupsy: any, basket: any) => {
    if (!basket) return null;
    
    // Get the latest operation for tooltip info
    const latestOperation = getLatestOperation(basket.id);
    
    // Formato della cesta secondo l'immagine di riferimento
    return (
      <TooltipProvider key={`basket-${basket.id}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              onClick={() => handleBasketClick(basket)}
              className={`border rounded-md p-2 min-w-[140px] ${
                getBasketColorClass(basket)
              } cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="text-xs text-center text-gray-500 font-medium">CESTA #{basket.physicalNumber}</div>
              
              {latestOperation && (
                <>
                  {/* Taglia come nell'immagine di riferimento */}
                  <div className="font-bold text-sm text-center mt-1">
                    {latestOperation.animalsPerKg && getSizeCodeFromAnimalsPerKg(latestOperation.animalsPerKg)}
                  </div>
                  
                  {/* Peso totale e densità */}
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <div className="text-[11px] text-gray-600">Qtà:</div>
                    <div className="text-[11px] text-right">
                      {latestOperation.totalWeight?.toFixed(3).replace('.', ',')}kg
                    </div>
                    
                    <div className="text-[11px] text-gray-600">Ind:</div>
                    <div className="text-[11px] text-right">
                      {latestOperation.animalCount?.toLocaleString('it-IT')} animali
                    </div>
                    
                    <div className="text-[11px] text-gray-600">Op. per ID/PS:</div>
                    <div className="text-[11px] text-right">C{latestOperation.id.toString().padStart(3, '0')}</div>
                  </div>
                </>
              )}
              
              {!latestOperation && basket.state === "available" && (
                <div className="text-xs text-center my-2 text-gray-500">
                  In deposito
                </div>
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
    // Estrai il valore max_positions dal database (accettando varie possibili denominazioni)
    const maxPositionsFromDB = flupsy.max_positions || flupsy.maxPositions || flupsy.maxPosition || flupsy["max-positions"];
    const maxPositions = maxPositionsFromDB || 10; // Fallback se il valore non è presente
    
    // Il numero di posizioni deve essere esattamente la metà del valore max_positions per ogni fila
    const positionsPerRow = Math.floor(maxPositions / 2);
    
    // Se il valore è dispari, aggiungiamo una posizione in più alla fila DX (per arrotondare)
    const dxPositions = maxPositions % 2 === 0 ? positionsPerRow : positionsPerRow + 1;
    const sxPositions = positionsPerRow;
    
    // Trova i cestelli per questo FLUPSY
    const dxBaskets = allBaskets
      ?.filter((b: any) => b.flupsyId === flupsy.id && b.row === 'DX')
      .sort((a: any, b: any) => a.position - b.position) || [];
      
    const sxBaskets = allBaskets
      ?.filter((b: any) => b.flupsyId === flupsy.id && b.row === 'SX')
      .sort((a: any, b: any) => a.position - b.position) || [];
    
    // Prepara gli array per contenere tutte le posizioni, incluse quelle vuote
    const dxPositionsArray = Array(dxPositions).fill(null);
    const sxPositionsArray = Array(sxPositions).fill(null);
    
    // Popola le posizioni con i cestelli esistenti
    dxBaskets.forEach((basket: any) => {
      if (basket.position > 0 && basket.position <= dxPositions) {
        dxPositionsArray[basket.position - 1] = basket;
      }
    });
    
    sxBaskets.forEach((basket: any) => {
      if (basket.position > 0 && basket.position <= sxPositions) {
        sxPositionsArray[basket.position - 1] = basket;
      }
    });

    return (
      <div key={`flupsy-${flupsy.id}`} className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-blue-500 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7L12 17" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <div>
              <h3 className="text-lg font-bold">{flupsy.name}</h3>
              <div className="text-xs text-gray-500">{maxPositions} ceste</div>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Ca {flupsy.location || 'Pisani'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* DX row */}
          <div>
            <div className="flex items-center mb-1">
              <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-800 mr-2">Fila DX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="flex items-center">
              {/* Elica (propeller) a sinistra */}
              <div className="mr-3 flex-shrink-0">
                <svg className="w-10 h-10 text-blue-500 animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2C14.5 4 16 8 16 12C16 16 14.5 20 12 22C9.5 20 8 16 8 12C8 8 9.5 4 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {/* Ceste DX */}
              <div className="flex flex-row gap-2 overflow-x-auto pb-2">
                {dxPositionsArray.map((basket, index) => (
                  basket ? renderBasketPosition(flupsy, basket) : (
                    <div 
                      key={`empty-dx-${index}`}
                      className="border border-dashed border-gray-300 rounded-md p-2 min-w-[140px] text-center"
                    >
                      <div className="text-xs text-gray-500">CESTA #{index + 1}</div>
                      <div className="text-xs text-gray-400 my-2">Non attiva</div>
                      <div className="text-xs text-gray-400">In deposito</div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
          
          {/* SX row */}
          <div>
            <div className="flex items-center mb-1">
              <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-800 mr-2">Fila SX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="flex items-center">
              {/* Elica (propeller) a sinistra */}
              <div className="mr-3 flex-shrink-0">
                <svg className="w-10 h-10 text-blue-500 animate-spin-slow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2C14.5 4 16 8 16 12C16 16 14.5 20 12 22C9.5 20 8 16 8 12C8 8 9.5 4 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              {/* Ceste SX */}
              <div className="flex flex-row gap-2 overflow-x-auto pb-2">
                {sxPositionsArray.map((basket, index) => (
                  basket ? renderBasketPosition(flupsy, basket) : (
                    <div 
                      key={`empty-sx-${index}`}
                      className="border border-dashed border-gray-300 rounded-md p-2 min-w-[140px] text-center"
                    >
                      <div className="text-xs text-gray-500">CESTA #{index + 1}</div>
                      <div className="text-xs text-gray-400 my-2">Non attiva</div>
                      <div className="text-xs text-gray-400">In deposito</div>
                    </div>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {isLoadingFlupsys || isLoadingBaskets || isLoadingOperations || isLoadingCycles ? (
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Caricamento dati in corso...</p>
        </div>
      ) : (
        <>
          {/* Titolo e legenda */}
          <div className="mb-4">
            <h2 className="text-lg font-bold mb-2">Visualizzazione FLUPSY</h2>
            <p className="text-sm text-gray-500 mb-2">Disposizione delle ceste attive con dati</p>
            
            {/* Indicatori statistici */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                <span>Livello zoom: 1</span>
              </div>
              <div className="flex items-center bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                <span>Top SCR: 3</span>
              </div>
              <div className="flex items-center bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                <span>Top Popolazione: 3</span>
              </div>
              <div className="flex items-center bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                <span>Cesti Attivati: 3</span>
              </div>
            </div>
            
            {/* Top 3 categorie */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                <span>Top 3 ceste con miglior crescita</span>
              </div>
              <div className="flex items-center bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Top 3 ceste con maggiore popolazione</span>
              </div>
              <div className="flex items-center bg-purple-100 text-purple-800 rounded-full px-3 py-1 text-xs">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                <span>Top 3 ceste con più giorni ascesa</span>
              </div>
            </div>
            
            {/* Legenda Colori Taglie */}
            <div className="flex flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-red-50 border border-red-500"></span>
                <span>TP-800 e inferiori (Pre-ingresso iniziale)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-orange-50 border border-orange-500"></span>
                <span>TP-1000, TP-1140 (Pre-ingresso avanzato)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-lime-50 border border-lime-500"></span>
                <span>TP-1500 (Ingresso iniziale)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-yellow-50 border border-yellow-500"></span>
                <span>TP-2000 (Ingresso avanzato)</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-teal-50 border border-teal-500"></span>
                <span>TP-3000 (Pre-vendita)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-blue-50 border border-blue-500"></span>
                <span>TP-4000, TP-5000 (Commerciale)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-green-50 border border-green-500"></span>
                <span>TP-6000 e superiori (Commerciale grande)</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="w-4 h-4 bg-gray-100 border border-dashed border-gray-400"></span>
                <span>Cesta non attiva (in deposito)</span>
              </div>
            </div>
          </div>
          
          {/* Tab filter for FLUPSY status */}
          <Tabs
            defaultValue="all"
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">Tutti i FLUPSY</TabsTrigger>
              <TabsTrigger value="active">Con cestelli attivi</TabsTrigger>
              <TabsTrigger value="large">Con taglie grandi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {flupsys?.map((flupsy: any) => renderFlupsy(flupsy))}
            </TabsContent>
            
            <TabsContent value="active" className="space-y-4">
              {flupsys?.filter((flupsy: any) => {
                const flupsyBaskets = filteredBaskets?.filter((b: any) => b.flupsyId === flupsy.id);
                return flupsyBaskets?.some((b: any) => b.state === 'active');
              }).map((flupsy: any) => renderFlupsy(flupsy))}
            </TabsContent>
            
            <TabsContent value="large" className="space-y-4">
              {flupsys?.filter((flupsy: any) => {
                const flupsyBaskets = filteredBaskets?.filter((b: any) => b.flupsyId === flupsy.id);
                return flupsyBaskets?.some((b: any) => hasLargeSize(b));
              }).map((flupsy: any) => renderFlupsy(flupsy))}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}