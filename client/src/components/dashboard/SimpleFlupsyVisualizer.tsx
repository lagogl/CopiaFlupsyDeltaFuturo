import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { calculateAverageWeight } from '@/lib/utils';

export default function FlupsyVisualizer() {
  const [, navigate] = useLocation();
  
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

  // Fetch data
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
  
  // Helper functions
  const getBasketByPosition = (flupsyId: number, row: 'DX' | 'SX', position: number): Basket | undefined => {
    if (!baskets) return undefined;
    const flupsyBaskets = baskets.filter(b => b.flupsyId === flupsyId);
    return flupsyBaskets.find(b => b.row === row && b.position === position);
  };
  
  const getLatestOperation = (basketId: number): Operation | undefined => {
    if (!operations) return undefined;
    const basketOperations = operations.filter(op => op.basketId === basketId);
    if (basketOperations.length === 0) return undefined;
    
    return basketOperations.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };
  
  const hasMortalityData = (basket: Basket | undefined): boolean => {
    if (!basket) return false;
    const latestOp = getLatestOperation(basket.id);
    return !!(latestOp?.deadCount && latestOp.deadCount > 0);
  };
  
  const handleBasketClick = (basket: Basket | undefined) => {
    if (!basket) return;
    
    if (basket.state === 'active' && basket.currentCycleId) {
      navigate(`/cycles/${basket.currentCycleId}`);
    } else {
      navigate('/baskets');
    }
  };
  
  // Render basket
  const renderBasket = (flupsyId: number, row: 'DX' | 'SX', position: number) => {
    const basket = getBasketByPosition(flupsyId, row, position);
    const latestOperation = basket ? getLatestOperation(basket.id) : undefined;
    
    // Base styles
    let borderStyle = 'border';
    let bgStyle = 'bg-gray-50';
    
    // Style logic for active baskets
    if (basket && basket.state === 'active') {
      if (latestOperation?.animalsPerKg) {
        const avgWeight = calculateAverageWeight(latestOperation.animalsPerKg);
        
        if (avgWeight) {
          if (avgWeight >= 3000) {
            borderStyle = 'border-red-500 border-4';
            bgStyle = 'bg-red-50';
          } else if (avgWeight >= 1000) {
            borderStyle = 'border-orange-500 border-2';
            bgStyle = 'bg-orange-50';
          } else if (avgWeight >= 500) {
            borderStyle = 'border-yellow-500 border-2';
            bgStyle = 'bg-yellow-50';
          } else {
            borderStyle = 'border-green-500 border';
            bgStyle = 'bg-green-50';
          }
        }
      }
      
      // Additional styling for mortality data
      if (hasMortalityData(basket)) {
        borderStyle += ' ring-1 ring-red-500';
        bgStyle = 'bg-red-100';
      }
    } else if (!basket) {
      borderStyle = 'border border-dashed';
    }
    
    return (
      <div key={`basket-${flupsyId}-${row}-${position}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={() => basket && handleBasketClick(basket)}
                className={`${borderStyle} rounded-md p-2 text-center text-xs ${bgStyle} 
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
              {!basket ? (
                <div>Posizione vuota</div>
              ) : (
                <div className="w-60 p-2">
                  <div className="font-bold text-lg mb-1">Cestello #{basket.physicalNumber}</div>
                  <div className="text-sm mb-2">
                    <span className="text-muted-foreground">Stato: </span>
                    <span className="font-medium">{basket.state === 'active' ? 'Attivo' : 'Disponibile'}</span>
                  </div>
                  
                  {latestOperation && (
                    <>
                      <div className="text-sm mb-1">
                        <span className="text-muted-foreground">Ultima operazione: </span>
                        <span className="font-medium">{latestOperation.type}</span>
                        <div className="text-xs text-muted-foreground">
                          Data: {format(new Date(latestOperation.date), 'dd/MM/yyyy')}
                        </div>
                      </div>
                      
                      {latestOperation.animalsPerKg && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Peso medio: </span>
                          <span className="font-medium">{calculateAverageWeight(latestOperation.animalsPerKg)} mg</span>
                        </div>
                      )}
                      
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
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };
  
  // Render FLUPSY
  const renderFlupsy = (flupsy: Flupsy) => {
    return (
      <div className="mb-8" key={`flupsy-${flupsy.id}`}>
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                renderBasket(flupsy.id, 'DX', position)
              ))}
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(position => (
                renderBasket(flupsy.id, 'SX', position)
              ))}
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
      </CardHeader>
      
      <CardContent>
        {flupsys && flupsys.map(flupsy => (
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