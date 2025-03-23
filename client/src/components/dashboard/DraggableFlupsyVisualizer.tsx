import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { getBasketBorderClass, getBasketColorBySize, formatNumberWithCommas } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Info, Filter, MapPin, Fan, Wind } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Item types for drag and drop
const ItemTypes = {
  BASKET: 'basket'
};

// DraggableBasket component
interface BasketDragItem {
  id: number;
  sourceRow: string | null;
  sourcePosition: number | null;
}

interface DraggableBasketProps {
  basket: any;
  isDropDisabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

function DraggableBasket({ basket, isDropDisabled = false, children, onClick }: DraggableBasketProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BASKET,
    item: {
      id: basket.id,
      sourceRow: basket.row,
      sourcePosition: basket.position
    } as BasketDragItem,
    canDrag: basket && basket.state === 'active', // Solo i cestelli attivi possono essere trascinati
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  return (
    <div
      ref={drag}
      onClick={onClick}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        cursor: basket && basket.state === 'active' ? 'move' : 'pointer' 
      }}
    >
      {children}
    </div>
  );
}

// DropTarget component
interface DropTargetProps {
  flupsyId: number;
  row: 'DX' | 'SX';
  position: number;
  onDrop: (item: BasketDragItem, row: string, position: number) => void;
  isOccupied: boolean;
  children: React.ReactNode;
}

function DropTarget({ flupsyId, row, position, onDrop, isOccupied, children }: DropTargetProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BASKET,
    drop: (item: BasketDragItem) => onDrop(item, row, position),
    canDrop: () => !isOccupied, // Non si può trascinare su una posizione occupata
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  // Stile per evidenziare la posizione durante il drag-and-drop
  const isActive = isOver && canDrop;
  const backgroundColor = isActive ? 'rgba(52, 211, 153, 0.2)' : 'transparent';
  const border = isActive 
    ? '2px dashed rgba(52, 211, 153, 0.8)' 
    : isOver && !canDrop 
      ? '2px dashed rgba(239, 68, 68, 0.8)' 
      : '2px dashed transparent';

  return (
    <div 
      ref={drop} 
      style={{ backgroundColor, border, borderRadius: '0.375rem' }}
      className="transition-colors duration-200"
    >
      {children}
    </div>
  );
}

// Main component
export default function DraggableFlupsyVisualizer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  const [showFlupsySelector, setShowFlupsySelector] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingBasketMove, setPendingBasketMove] = useState<{
    basketId: number;
    targetRow: string;
    targetPosition: number;
  } | null>(null);

  // Data queries
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Update basket position mutation
  const updateBasketPosition = useMutation({
    mutationFn: async ({ basketId, row, position }: { basketId: number; row: string; position: number }) => {
      return await apiRequest('PATCH', `/api/baskets/${basketId}`, {
        row,
        position
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      toast({
        title: "Posizione aggiornata",
        description: "La posizione della cesta è stata aggiornata con successo.",
      });
      setConfirmDialogOpen(false);
      setPendingBasketMove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento della posizione.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      setPendingBasketMove(null);
    }
  });

  // Initialize selected FLUPSYs on data load
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
      setSelectedFlupsyIds([flupsys[0].id]);
    }
  }, [flupsys, selectedFlupsyIds]);

  // Handle drop event
  const handleBasketDrop = useCallback((item: BasketDragItem, targetRow: string, targetPosition: number) => {
    if (item.sourceRow === targetRow && item.sourcePosition === targetPosition) {
      return; // No change in position
    }
    
    setPendingBasketMove({
      basketId: item.id,
      targetRow,
      targetPosition
    });
    setConfirmDialogOpen(true);
  }, []);

  // Handle basket click
  const handleBasketClick = (basket: any) => {
    if (basket) {
      // Navigate to basket details page or open a dialog with details
      console.log("Basket clicked:", basket);
    }
  };

  // Confirm basket move
  const confirmBasketMove = () => {
    if (pendingBasketMove) {
      updateBasketPosition.mutate({
        basketId: pendingBasketMove.basketId,
        row: pendingBasketMove.targetRow,
        position: pendingBasketMove.targetPosition
      });
    }
  };

  // Render a basket box or empty position
  const renderBasketBox = (basket: any, position: number, row: 'DX' | 'SX', flupsyId: number) => {
    const isOccupied = !!basket;
    
    // Get additional data for the basket
    let latestOperation = null;
    let cycle = null;
    let size = null;
    let animalCount = null;
    let startDate = null;
    
    if (isOccupied) {
      // Get latest operation for this basket
      const basketOperations = operations
        ? operations
            .filter((op: any) => op.basketId === basket.id)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      latestOperation = basketOperations.length > 0 ? basketOperations[0] : null;
      
      // Get cycle data
      if (basket.currentCycleId) {
        cycle = queryClient.getQueryData(['api/cycles'])?.find((c: any) => c.id === basket.currentCycleId);
        if (cycle) {
          startDate = new Date(cycle.startDate);
        }
      }
      
      // Get size and animal count from latest operation
      if (latestOperation) {
        size = latestOperation.size?.code;
        animalCount = latestOperation.animalCount;
        if (!animalCount && latestOperation.animalsPerKg) {
          // Calcola il numero di animali solo se non è già presente nel campo animalCount
          const totalWeight = latestOperation.totalWeight || 0;
          if (totalWeight > 0) {
            // totalWeight è in grammi, convertiamo in kg e moltiplichiamo per animali/kg
            animalCount = Math.round((totalWeight / 1000) * latestOperation.animalsPerKg);
          }
        }
      }
    }
    
    const content = (
      <div 
        className={`
          rounded-md p-2 text-center text-xs
          ${isOccupied 
            ? `${getBasketBorderClass(latestOperation?.animalsPerKg)} ${getBasketColorBySize(size)}` 
            : 'border border-dashed border-gray-300 bg-gray-50'
          }
          min-h-[120px] flex flex-col justify-between items-center
        `}
      >
        {isOccupied ? (
          <>
            {/* Header con numero fisico cesta */}
            <div className="font-semibold w-full border-b pb-1 text-center">
              <span className="text-base">#{basket.physicalNumber}</span>
            </div>
            
            {/* Corpo con dati principali */}
            <div className="py-1 flex flex-col items-center">
              {/* Taglia */}
              {size && (
                <div className="font-medium">
                  <span className="text-gray-700">Taglia:</span> {size}
                </div>
              )}
              
              {/* Numero animali */}
              {animalCount && (
                <div className="text-[10px]">
                  <span className="text-gray-700">Animali:</span> {formatNumberWithCommas(animalCount)}
                </div>
              )}
              
              {/* Data inizio ciclo */}
              {startDate && (
                <div className="text-[10px]">
                  <span className="text-gray-700">Dal:</span> {startDate.toLocaleDateString()}
                </div>
              )}
            </div>
            
            {/* Footer con stato */}
            <div className="w-full pt-1 border-t text-center">
              <div className={`text-[10px] rounded px-1 ${basket.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {basket.currentCycleId ? 
                  <span>Ciclo {basket.currentCycleId}</span> : 
                  <span>{basket.state === 'active' ? 'Attiva' : 'Disponibile'}</span>
                }
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-400 flex flex-col items-center justify-center h-full">
            <MapPin className="h-4 w-4 mx-auto mb-1" />
            <span>{row}-{position}</span>
          </div>
        )}
      </div>
    );

    return (
      <DropTarget
        key={`${flupsyId}-${row}-${position}`}
        flupsyId={flupsyId}
        row={row}
        position={position}
        onDrop={handleBasketDrop}
        isOccupied={isOccupied}
      >
        {isOccupied ? (
          <DraggableBasket 
            basket={basket} 
            onClick={() => handleBasketClick(basket)}
          >
            {content}
          </DraggableBasket>
        ) : (
          content
        )}
      </DropTarget>
    );
  };

  // Render tooltip content for a basket
  const renderTooltipContent = (basket: any) => {
    if (!basket) return null;

    // Get the latest operation for this basket
    const basketOperations = operations
      ? operations
          .filter((op: any) => op.basketId === basket.id)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      : [];
    const latestOperation = basketOperations.length > 0 ? basketOperations[0] : null;
    
    // Get cycle data
    let cycle = null;
    let startDate = null;
    if (basket.currentCycleId) {
      cycle = queryClient.getQueryData(['api/cycles'])?.find((c: any) => c.id === basket.currentCycleId);
      if (cycle) {
        startDate = new Date(cycle.startDate);
      }
    }
    
    // Calcola il numero di giorni del ciclo se startDate è disponibile
    let cycleDays = null;
    if (startDate) {
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - startDate.getTime());
      cycleDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Calcola il numero di animali se disponibile
    let animalCount = null;
    if (latestOperation) {
      animalCount = latestOperation.animalCount;
      if (!animalCount && latestOperation.animalsPerKg) {
        const totalWeight = latestOperation.totalWeight || 0;
        if (totalWeight > 0) {
          animalCount = Math.round((totalWeight / 1000) * latestOperation.animalsPerKg);
        }
      }
    }

    return (
      <div className="p-3 max-w-[320px]">
        <div className="font-semibold text-base mb-2 border-b pb-1">Cesta #{basket.physicalNumber}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div><span className="font-medium text-gray-700">Stato:</span> {basket.state === 'active' ? 'Attiva' : 'Disponibile'}</div>
          <div><span className="font-medium text-gray-700">Posizione:</span> {basket.row || '-'}-{basket.position || '-'}</div>
          
          {cycle && (
            <>
              <div><span className="font-medium text-gray-700">Ciclo:</span> #{cycle.id}</div>
              {cycleDays && (
                <div><span className="font-medium text-gray-700">Giorni:</span> {cycleDays}</div>
              )}
              {startDate && (
                <div><span className="font-medium text-gray-700">Inizio:</span> {startDate.toLocaleDateString()}</div>
              )}
            </>
          )}
          
          {latestOperation && (
            <>
              <div className="col-span-2 mt-1 pt-1 border-t font-medium text-gray-900">Ultima operazione:</div>
              <div><span className="font-medium text-gray-700">Tipo:</span> {latestOperation.type}</div>
              <div><span className="font-medium text-gray-700">Data:</span> {new Date(latestOperation.date).toLocaleDateString()}</div>
              
              {latestOperation.animalsPerKg && (
                <div><span className="font-medium text-gray-700">Animali/kg:</span> {formatNumberWithCommas(latestOperation.animalsPerKg)}</div>
              )}
              
              {animalCount && (
                <div><span className="font-medium text-gray-700">Tot. animali:</span> {formatNumberWithCommas(animalCount)}</div>
              )}
              
              {latestOperation.sizeId && latestOperation.size && (
                <div><span className="font-medium text-gray-700">Taglia:</span> {latestOperation.size.code}</div>
              )}
              
              {latestOperation.averageWeight && (
                <div><span className="font-medium text-gray-700">Peso medio:</span> {latestOperation.averageWeight.toFixed(2)} mg</div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render a single FLUPSY grid
  const renderFlupsyGrid = (flupsyId: number) => {
    const flupsy = flupsys?.find((f: any) => f.id === flupsyId);
    if (!flupsy || !baskets) return null;
    
    // Get baskets for this FLUPSY
    const flupsyBaskets = baskets.filter((b: any) => b.flupsyId === flupsyId);
    const flupsyDxRow = flupsyBaskets.filter((b: any) => b.row === 'DX');
    const flupsySxRow = flupsyBaskets.filter((b: any) => b.row === 'SX');
    
    // Calculate max positions
    const flupsyMaxPositions = Math.max(
      ...flupsyBaskets
        .filter((b: any) => b.position !== null && b.position !== undefined)
        .map((b: any) => b.position || 0),
      10 // Minimum of 10 positions
    );
    
    // Helper function to get the basket at a specific position
    const getFlupsyBasketByPosition = (row: 'DX' | 'SX', position: number): any => {
      if (row === 'DX') {
        return flupsyDxRow.find((b: any) => b.position === position);
      }
      return flupsySxRow.find((b: any) => b.position === position);
    };
    
    return (
      <div key={flupsyId} className="border rounded-lg p-4 relative mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="font-medium text-base">{flupsy.name}</div>
          <Badge variant="outline" className="absolute right-2 top-2">
            Cestelli: {flupsyBaskets.length}
          </Badge>
        </div>
        
        <div className="space-y-6 relative">
          {/* Icona elica (per orientare l'operatore) */}
          <div className="absolute -left-14 top-0 z-10">
            <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center text-blue-700 border-2 border-blue-300">
              <Fan className="w-10 h-10 animate-spin-slow" />
            </div>
          </div>
          
          {/* DX row (Right row) */}
          <div>
            <div className="flex items-center mb-2">
              <Badge variant="secondary" className="mr-2">Fila DX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                const basket = getFlupsyBasketByPosition('DX', position);
                
                return (
                  <TooltipProvider key={`${flupsyId}-dx-${position}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {renderBasketBox(basket, position, 'DX', flupsyId)}
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
            <div className="flex items-center mb-2">
              <Badge variant="secondary" className="mr-2">Fila SX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                const basket = getFlupsyBasketByPosition('SX', position);
                
                return (
                  <TooltipProvider key={`${flupsyId}-sx-${position}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {renderBasketBox(basket, position, 'SX', flupsyId)}
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
    );
  };

  // Render the FLUPSY grids
  const renderFlupsyGrids = () => {
    if (isLoadingFlupsys || isLoadingBaskets) {
      return <div className="py-8 text-center">Caricamento dati FLUPSY...</div>;
    }
    
    if (!flupsys || flupsys.length === 0) {
      return <div className="py-8 text-center">Nessuna unità FLUPSY configurata</div>;
    }
    
    // Render selected FLUPSYs
    return (
      <div className="space-y-8">
        {selectedFlupsyIds.map(flupsyId => renderFlupsyGrid(flupsyId))}
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Gestione Posizioni FLUPSY</CardTitle>
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
            Trascina le ceste per riposizionarle all'interno dell'unità FLUPSY
          </CardDescription>
          
          {/* FLUPSY Selector */}
          {showFlupsySelector && (
            <div className="border rounded-md p-3 mt-2 bg-muted/20">
              <div className="text-sm font-medium mb-2">Seleziona unità FLUPSY:</div>
              <div className="flex flex-wrap gap-2">
                {flupsys?.map((flupsy: any) => (
                  <Badge 
                    key={flupsy.id}
                    variant={selectedFlupsyIds.includes(flupsy.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (selectedFlupsyIds.includes(flupsy.id)) {
                        // Remove if already selected and there's more than one
                        if (selectedFlupsyIds.length > 1) {
                          setSelectedFlupsyIds(selectedFlupsyIds.filter(id => id !== flupsy.id));
                        }
                      } else {
                        // Add to selection
                        setSelectedFlupsyIds([...selectedFlupsyIds, flupsy.id]);
                      }
                    }}
                  >
                    {flupsy.name}
                  </Badge>
                ))}
              </div>
              
              <div className="flex items-center mt-4 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mr-1" />
                Trascina una cesta e rilasciala su una posizione vuota per spostarla.
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {renderFlupsyGrids()}
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma spostamento</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi spostare la cesta nella nuova posizione?
              {pendingBasketMove && (
                <div className="mt-2 text-sm bg-muted p-2 rounded">
                  <span className="font-medium">Nuova posizione:</span> 
                  {pendingBasketMove.targetRow}-{pendingBasketMove.targetPosition}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmDialogOpen(false);
                setPendingBasketMove(null);
              }}
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmBasketMove}>
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}