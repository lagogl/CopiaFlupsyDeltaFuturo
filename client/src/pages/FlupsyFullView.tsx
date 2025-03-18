import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getOperationTypeLabel, getOperationTypeColor } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, Filter, Calendar, ListFilter, Grid3X3, PanelLeft } from "lucide-react";

type ViewMode = 'compact' | 'detailed' | 'positions';

export default function FlupsyFullView() {
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Fetch flupsys
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  // Fetch baskets
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  // Fetch operations
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  // Fetch cycles
  const { data: cycles, isLoading: isLoadingCycles } = useQuery({
    queryKey: ['/api/cycles'],
  });
  
  // Select the first FLUPSY by default
  if (flupsys && flupsys.length > 0 && !selectedFlupsyId) {
    setSelectedFlupsyId(flupsys[0].id);
  }
  
  // Get the selected FLUPSY
  const selectedFlupsy = flupsys?.find((f: any) => f.id === selectedFlupsyId);
  
  // Filter baskets by selected FLUPSY
  const filteredBaskets = baskets 
    ? baskets.filter((b: any) => b.flupsyId === selectedFlupsyId)
    : [];
  
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
  
  // Get operations for a specific basket
  const getBasketOperations = (basketId: number) => {
    return operations ? operations.filter((op: any) => op.basketId === basketId) : [];
  };

  // Get current cycle for a basket
  const getBasketCycle = (cycleId: number | null) => {
    if (!cycleId) return null;
    return cycles ? cycles.find((c: any) => c.id === cycleId) : null;
  };
  
  // Loading state
  const isLoading = isLoadingFlupsys || isLoadingBaskets || isLoadingOperations || isLoadingCycles;
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Caricamento...</div>;
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with back button and controls */}
      <header className="border-b sticky top-0 z-10 bg-background">
        <div className="container mx-auto py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href="/" className="text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="w-4 h-4" />
              <span className="sr-only">Indietro</span>
            </a>
            <h1 className="text-xl font-bold">Vista Dettagliata FLUPSY</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <PanelLeft className="w-4 h-4" />
              {showSidebar ? 'Nascondi menu' : 'Mostra menu'}
            </Button>
            
            <Select
              value={viewMode}
              onValueChange={(value) => setViewMode(value as ViewMode)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Modalità visualizzazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Vista dettagliata</SelectItem>
                <SelectItem value="compact">Vista compatta</SelectItem>
                <SelectItem value="positions">Solo posizioni</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with FLUPSY selection and filters */}
        {showSidebar && (
          <aside className="w-64 border-r p-4 overflow-auto">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Seleziona unità FLUPSY</h3>
                <Select 
                  value={selectedFlupsyId?.toString() || ""} 
                  onValueChange={(value) => setSelectedFlupsyId(Number(value))}
                >
                  <SelectTrigger>
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
              
              <div>
                <h3 className="font-medium mb-2">Filtri</h3>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Filter className="w-4 h-4" />
                    Filtra per stato
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <Calendar className="w-4 h-4" />
                    Filtra per data
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                    <ListFilter className="w-4 h-4" />
                    Filtra per operazioni
                  </Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Statistiche</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Totale cestelli:</span>
                    <span>{filteredBaskets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cestelli attivi:</span>
                    <span>{filteredBaskets.filter((b: any) => b.state === 'active').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fila DX:</span>
                    <span>{dxRow.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fila SX:</span>
                    <span>{sxRow.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Non assegnati:</span>
                    <span>{noRowAssigned.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
        
        {/* Main content with FLUPSY visualization */}
        <main className={`flex-1 overflow-auto p-4 ${showSidebar ? '' : 'container mx-auto'}`}>
          {!selectedFlupsy ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h2 className="text-xl font-medium">Nessuna unità FLUPSY selezionata</h2>
              <p className="text-muted-foreground">Seleziona un'unità FLUPSY dal menu laterale per visualizzare i dettagli</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg relative">
                <h2 className="text-xl font-bold">{selectedFlupsy.name}</h2>
                {selectedFlupsy.location && (
                  <p className="text-muted-foreground">Posizione: {selectedFlupsy.location}</p>
                )}
                
                <Badge variant="outline" className="absolute right-6 top-6">
                  Cestelli: {filteredBaskets.length}
                </Badge>
                
                {/* Propeller indicator */}
                <div className="relative mt-8 mb-4">
                  <div className="bg-gray-300 w-16 h-16 rounded-full absolute -left-8 -top-8 flex items-center justify-center">
                    <span className="text-xs font-semibold">Elica</span>
                  </div>
                </div>
                
                <div className="space-y-6 mt-8">
                  {/* DX row (Right row) */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Badge variant="secondary" className="mr-2">Fila DX</Badge>
                      <Separator className="flex-grow" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3">
                      {Array.from({ length: maxPositions }).map((_, i) => {
                        const position = i + 1;
                        const basket = getBasketByPosition('DX', position);
                        const basketOperations = basket ? getBasketOperations(basket.id) : [];
                        const cycle = basket?.currentCycleId ? getBasketCycle(basket.currentCycleId) : null;
                        
                        return (
                          <BasketPositionCard
                            key={`dx-${position}`}
                            position={position}
                            basket={basket}
                            operations={basketOperations}
                            cycle={cycle}
                            viewMode={viewMode}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* SX row (Left row) */}
                  <div>
                    <div className="flex items-center mb-2">
                      <Badge variant="secondary" className="mr-2">Fila SX</Badge>
                      <Separator className="flex-grow" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-3">
                      {Array.from({ length: maxPositions }).map((_, i) => {
                        const position = i + 1;
                        const basket = getBasketByPosition('SX', position);
                        const basketOperations = basket ? getBasketOperations(basket.id) : [];
                        const cycle = basket?.currentCycleId ? getBasketCycle(basket.currentCycleId) : null;
                        
                        return (
                          <BasketPositionCard
                            key={`sx-${position}`}
                            position={position}
                            basket={basket}
                            operations={basketOperations}
                            cycle={cycle}
                            viewMode={viewMode}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Unassigned baskets section */}
              {noRowAssigned.length > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="mb-2">
                    <Badge variant="destructive" className="mb-2">Cestelli senza posizione assegnata</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {noRowAssigned.map((basket: any) => {
                      const basketOperations = getBasketOperations(basket.id);
                      const cycle = basket?.currentCycleId ? getBasketCycle(basket.currentCycleId) : null;
                      
                      return (
                        <BasketPositionCard
                          key={basket.id}
                          basket={basket}
                          operations={basketOperations}
                          cycle={cycle}
                          viewMode={viewMode}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Component to display a basket in a position
interface BasketPositionCardProps {
  position?: number;
  basket?: any;
  operations?: any[];
  cycle?: any;
  viewMode: ViewMode;
}

function BasketPositionCard({ position, basket, operations = [], cycle, viewMode }: BasketPositionCardProps) {
  // Sort operations by date (newest first)
  const sortedOperations = [...operations].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Get the latest operation
  const latestOperation = sortedOperations.length > 0 ? sortedOperations[0] : null;
  
  // Determine the class based on basket state
  const getCardClass = () => {
    if (!basket) return 'bg-gray-50 border-dashed';
    if (basket.state === 'active') return 'bg-green-50 border-green-300';
    return 'bg-gray-100';
  };
  
  // Render different content based on view mode
  const renderContent = () => {
    if (viewMode === 'positions') {
      return (
        <>
          <div className="font-medium">Pos. {position}</div>
          {basket && (
            <div>
              <div className="text-sm font-semibold mt-1">#{basket.physicalNumber}</div>
              {basket.state === 'active' && <Badge variant="success" className="mt-1">Attivo</Badge>}
            </div>
          )}
        </>
      );
    }
    
    if (viewMode === 'compact') {
      return (
        <>
          <div className="font-medium">Pos. {position}</div>
          {basket && (
            <div>
              <div className="font-semibold mt-1">#{basket.physicalNumber}</div>
              {basket.currentCycleId && (
                <div className="text-xs bg-blue-100 rounded px-1 mt-1">
                  Ciclo {basket.currentCycleId}
                </div>
              )}
              {latestOperation && (
                <div className="mt-2">
                  <Badge className={getOperationTypeColor(latestOperation.type)}>
                    {getOperationTypeLabel(latestOperation.type)}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </>
      );
    }
    
    return (
      <>
        <div className="font-medium">{position ? `Pos. ${position}` : 'Senza pos.'}</div>
        {basket ? (
          <div className="mt-1">
            <div className="flex justify-between items-center">
              <div className="font-bold">#{basket.physicalNumber}</div>
              <Badge variant={basket.state === 'active' ? 'success' : 'secondary'}>
                {basket.state === 'active' ? 'Attivo' : 'Disponibile'}
              </Badge>
            </div>
            
            {cycle && (
              <div className="text-xs bg-blue-100 rounded px-1 py-0.5 mt-1">
                <div>Ciclo #{cycle.id}</div>
                <div>Inizio: {format(new Date(cycle.startDate), 'dd/MM/yyyy')}</div>
              </div>
            )}
            
            {operations.length > 0 ? (
              <div className="mt-2">
                <Tabs defaultValue="latest">
                  <TabsList className="grid w-full grid-cols-2 h-7">
                    <TabsTrigger value="latest" className="text-xs">Ultima op.</TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">Tutte ({operations.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="latest">
                    {latestOperation && (
                      <div className="mt-1 text-xs">
                        <Badge className={getOperationTypeColor(latestOperation.type)}>
                          {getOperationTypeLabel(latestOperation.type)}
                        </Badge>
                        <div className="mt-1">
                          Data: {format(new Date(latestOperation.date), 'dd/MM/yy')}
                        </div>
                        {latestOperation.animalsPerKg && (
                          <div>Animali/kg: {latestOperation.animalsPerKg}</div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="all">
                    <div className="text-xs max-h-24 overflow-auto">
                      {sortedOperations.map((op) => (
                        <div key={op.id} className="border-b py-1 last:border-0">
                          <Badge className={getOperationTypeColor(op.type)} variant="outline">
                            {getOperationTypeLabel(op.type)}
                          </Badge>
                          <div className="mt-0.5">{format(new Date(op.date), 'dd/MM/yy')}</div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2">
                Nessuna operazione registrata
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground mt-2">
            Nessun cestello in questa posizione
          </div>
        )}
      </>
    );
  };
  
  return (
    <Card className={`p-3 ${getCardClass()}`}>
      {renderContent()}
    </Card>
  );
}