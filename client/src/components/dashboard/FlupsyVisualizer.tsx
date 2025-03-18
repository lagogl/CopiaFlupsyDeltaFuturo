import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from '@/hooks/use-mobile';

export default function FlupsyVisualizer() {
  const isMobile = useIsMobile();
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  
  // Fetch flupsys
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  // Fetch baskets
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  // Select the first FLUPSY by default
  if (flupsys && flupsys.length > 0 && !selectedFlupsyId) {
    setSelectedFlupsyId(flupsys[0].id);
  }
  
  // Get the selected FLUPSY
  const selectedFlupsy = flupsys?.find((f: any) => f.id === selectedFlupsyId);
  
  // Filter baskets by selected FLUPSY
  const filteredBaskets = baskets ? baskets.filter((b: any) => b.flupsyId === selectedFlupsyId) : [];
  
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
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Visualizzazione FLUPSY</CardTitle>
        <CardDescription>
          Disposizione delle ceste all'interno dell'unità FLUPSY
        </CardDescription>
        
        <div className="pt-2">
          <div className="space-y-1">
            <div className="text-sm font-medium">Seleziona unità FLUPSY:</div>
            <Select 
              disabled={isLoadingFlupsys} 
              value={selectedFlupsyId?.toString() || ""}
              onValueChange={(value) => setSelectedFlupsyId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona unità FLUPSY" />
              </SelectTrigger>
              <SelectContent>
                {flupsys && flupsys.map((flupsy: any) => (
                  <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                    {flupsy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoadingBaskets || isLoadingFlupsys ? (
          <div className="text-center py-4">Caricamento...</div>
        ) : selectedFlupsy ? (
          <div className="space-y-8">
            {/* FLUPSY Visualization */}
            <div className="border rounded-lg p-4 relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div>Vista lato elica ({selectedFlupsy.name})</div>
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
                  <div className="bg-gray-300 w-12 h-12 rounded-full absolute -left-6 -top-6 flex items-center justify-center">
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
                          <div 
                            key={`dx-${position}`} 
                            className={`border rounded-md p-2 text-center text-xs ${
                              basket ? (
                                basket.state === 'active' ? 'bg-green-100 border-green-300' : 'bg-gray-100'
                              ) : 'bg-gray-50 border-dashed'
                            }`}
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
                          <div 
                            key={`sx-${position}`} 
                            className={`border rounded-md p-2 text-center text-xs ${
                              basket ? (
                                basket.state === 'active' ? 'bg-green-100 border-green-300' : 'bg-gray-100'
                              ) : 'bg-gray-50 border-dashed'
                            }`}
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
                    <div 
                      key={basket.id}
                      className={`border rounded-md p-2 text-center text-xs ${
                        basket.state === 'active' ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-100'
                      }`}
                    >
                      <div>Cesta #{basket.physicalNumber}</div>
                      <div className="mt-1 text-gray-500">
                        {basket.state === 'active' ? 'Attiva' : 'Disponibile'}
                      </div>
                    </div>
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