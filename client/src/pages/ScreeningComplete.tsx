import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { getBasketBorderClass, getBasketColorBySize, formatNumberWithCommas } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Filter, MapPin, Fan, Wind, Trash2, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { Helmet } from "react-helmet";

// Item types per drag and drop
const ItemTypes = {
  BASKET: 'basket',
  TRASH: 'trash'
};

// DraggableDestinationBasket component
interface BasketDragItem {
  id: number;
  basketId: number;
  destinationId: number;
  flupsyId: number | null;
  row: string | null;
  position: number | null;
}

interface DraggableBasketProps {
  basket: any;
  children: React.ReactNode;
  onClick?: () => void;
}

function DraggableBasket({ basket, children, onClick }: DraggableBasketProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BASKET,
    item: {
      id: basket.id,
      basketId: basket.basketId,
      destinationId: basket.id,
      flupsyId: basket.flupsyId,
      row: basket.row,
      position: basket.position
    } as BasketDragItem,
    canDrag: !basket.positionAssigned, // Solo i cestelli senza posizione possono essere trascinati
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
        cursor: !basket.positionAssigned ? 'move' : 'pointer' 
      }}
    >
      {children}
    </div>
  );
}

// DraggableSourceBasket component for dismissal
interface SourceBasketDragItem {
  id: number;
  sourceBasketId: number;
}

interface DraggableSourceBasketProps {
  basket: any;
  children: React.ReactNode;
  onClick?: () => void;
}

function DraggableSourceBasket({ basket, children, onClick }: DraggableSourceBasketProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TRASH,
    item: {
      id: basket.id,
      sourceBasketId: basket.id
    } as SourceBasketDragItem,
    canDrag: !basket.dismissed, // Solo i cestelli non dismessi possono essere trascinati
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
        cursor: !basket.dismissed ? 'move' : 'pointer' 
      }}
    >
      {children}
    </div>
  );
}

// DropTarget component for FLUPSY positions
interface DropTargetProps {
  flupsyId: number;
  row: 'DX' | 'SX';
  position: number;
  onDrop: (item: BasketDragItem, flupsyId: number, row: string, position: number) => void;
  isOccupied: boolean;
  children: React.ReactNode;
}

function DropTarget({ flupsyId, row, position, onDrop, isOccupied, children }: DropTargetProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BASKET,
    drop: (item: BasketDragItem) => {
      return onDrop(item, flupsyId, row, position);
    },
    canDrop: () => !isOccupied, // Solo posizioni libere possono ricevere drop
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  // Stile per evidenziare la posizione durante il drag-and-drop
  let backgroundColor = 'transparent';
  let border = '2px dashed transparent';
  
  if (isOver && canDrop) {
    backgroundColor = 'rgba(52, 211, 153, 0.2)'; // Verde per posizioni disponibili
    border = '2px dashed rgba(52, 211, 153, 0.8)';
  } else if (canDrop) {
    backgroundColor = 'rgba(52, 211, 153, 0.05)'; // Verde molto chiaro per posizioni disponibili
    border = '2px dashed rgba(52, 211, 153, 0.3)';
  }

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

// TrashDropTarget per la dismissione delle ceste di origine
interface TrashDropTargetProps {
  onDrop: (item: SourceBasketDragItem) => void;
  children: React.ReactNode;
}

function TrashDropTarget({ onDrop, children }: TrashDropTargetProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.TRASH,
    drop: (item: SourceBasketDragItem) => {
      return onDrop(item);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  // Stile per evidenziare il cestino durante il drag-and-drop
  let backgroundColor = 'rgba(239, 68, 68, 0.05)';
  let border = '2px dashed rgba(239, 68, 68, 0.3)';
  
  if (isOver && canDrop) {
    backgroundColor = 'rgba(239, 68, 68, 0.2)';
    border = '2px dashed rgba(239, 68, 68, 0.8)';
  }

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
export default function ScreeningComplete() {
  const { screeningId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [allPositionsAssigned, setAllPositionsAssigned] = useState(false);
  const [allSourcesDismissed, setAllSourcesDismissed] = useState(false);
  
  // Pending actions state
  const [pendingPositionAssignment, setPendingPositionAssignment] = useState<{
    destinationId: number;
    flupsyId: number;
    row: string;
    position: number;
  } | null>(null);
  
  const [pendingSourceDismissal, setPendingSourceDismissal] = useState<{
    sourceBasketId: number;
  } | null>(null);
  
  const [completeInProgress, setCompleteInProgress] = useState(false);

  // Data queries
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: screeningOperation, isLoading: isLoadingScreening } = useQuery({
    queryKey: ['/api/screening/operations', screeningId],
    queryFn: async () => {
      if (!screeningId) return null;
      return apiRequest<any>({ 
        url: `/api/screening/operations/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId
  });
  
  const { data: sourceBaskets, isLoading: isLoadingSourceBaskets } = useQuery({
    queryKey: ['/api/screening/source-baskets', screeningId],
    queryFn: async () => {
      if (!screeningId) return [];
      return apiRequest<any[]>({ 
        url: `/api/screening/source-baskets/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId
  });
  
  const { data: destinationBaskets, isLoading: isLoadingDestBaskets } = useQuery({
    queryKey: ['/api/screening/destination-baskets', screeningId],
    queryFn: async () => {
      if (!screeningId) return [];
      return apiRequest<any[]>({ 
        url: `/api/screening/destination-baskets/${screeningId}`,
        method: 'GET'
      });
    },
    enabled: !!screeningId
  });

  // Mutations
  const assignPositionMutation = useMutation({
    mutationFn: async ({ 
      destinationId, 
      flupsyId, 
      row, 
      position 
    }: { 
      destinationId: number;
      flupsyId: number;
      row: string;
      position: number;
    }) => {
      return await apiRequest({
        url: `/api/screening/destination-baskets/${destinationId}/position`,
        method: 'PATCH',
        body: {
          flupsyId,
          row,
          position
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/destination-baskets', screeningId] });
      toast({
        title: "Posizione assegnata",
        description: "La posizione della cesta è stata assegnata con successo.",
      });
      setConfirmDialogOpen(false);
      setPendingPositionAssignment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'assegnazione della posizione.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      setPendingPositionAssignment(null);
    }
  });
  
  const dismissSourceBasketMutation = useMutation({
    mutationFn: async ({ sourceBasketId }: { sourceBasketId: number }) => {
      return await apiRequest({
        url: `/api/screening/source-baskets/${sourceBasketId}/dismiss`,
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/source-baskets', screeningId] });
      toast({
        title: "Cesta dismessa",
        description: "La cesta di origine è stata dismessa con successo.",
      });
      setPendingSourceDismissal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la dismissione della cesta.",
        variant: "destructive",
      });
      setPendingSourceDismissal(null);
    }
  });
  
  const completeScreeningMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        url: `/api/screening/operations/${screeningId}/complete`,
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/screening/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      
      toast({
        title: "Vagliatura completata",
        description: "L'operazione di vagliatura è stata completata con successo.",
      });
      
      // Redirect back to screening details page
      navigate(`/screening/${screeningId}`);
    },
    onError: (error: any) => {
      setCompleteInProgress(false);
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il completamento della vagliatura.",
        variant: "destructive",
      });
    }
  });

  // Initialize selected FLUPSYs on data load
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
      // Seleziona tutti i flupsy disponibili invece di solo il primo
      const allFlupsyIds = flupsys.map((flupsy: any) => flupsy.id);
      setSelectedFlupsyIds(allFlupsyIds);
    }
  }, [flupsys, selectedFlupsyIds]);
  
  // Check if all positions are assigned and all sources dismissed
  useEffect(() => {
    if (destinationBaskets && destinationBaskets.length > 0) {
      const allAssigned = destinationBaskets.every((basket: any) => basket.positionAssigned);
      setAllPositionsAssigned(allAssigned);
    }
    
    if (sourceBaskets && sourceBaskets.length > 0) {
      const allDismissed = sourceBaskets.every((basket: any) => basket.dismissed);
      setAllSourcesDismissed(allDismissed);
    }
  }, [destinationBaskets, sourceBaskets]);

  // Handle drop on FLUPSY position
  const handlePositionDrop = useCallback((item: BasketDragItem, flupsyId: number, row: string, position: number) => {
    console.log("Dragging basket to position:", item, flupsyId, row, position);
    
    setPendingPositionAssignment({
      destinationId: item.destinationId,
      flupsyId,
      row,
      position
    });
    
    setConfirmDialogOpen(true);
  }, []);
  
  // Handle drop on trash for source basket dismissal
  const handleTrashDrop = useCallback((item: SourceBasketDragItem) => {
    console.log("Dismissing source basket:", item);
    
    setPendingSourceDismissal({
      sourceBasketId: item.sourceBasketId
    });
    
    // Execute immediately without confirmation
    dismissSourceBasketMutation.mutate({ sourceBasketId: item.sourceBasketId });
  }, [dismissSourceBasketMutation]);

  // Confirm position assignment
  const confirmPositionAssignment = () => {
    if (!pendingPositionAssignment) return;
    
    assignPositionMutation.mutate({
      destinationId: pendingPositionAssignment.destinationId,
      flupsyId: pendingPositionAssignment.flupsyId,
      row: pendingPositionAssignment.row,
      position: pendingPositionAssignment.position
    });
  };
  
  // Handle complete screening operation
  const handleCompleteScreening = () => {
    if (!allPositionsAssigned || !allSourcesDismissed) {
      toast({
        title: "Impossibile completare",
        description: !allPositionsAssigned 
          ? "Devi assegnare posizioni a tutte le ceste di destinazione." 
          : "Devi dismettere tutte le ceste di origine.",
        variant: "destructive",
      });
      return;
    }
    
    setCompleteInProgress(true);
    completeScreeningMutation.mutate();
  };

  // Render destination basket card (to be dragged)
  const renderDestinationBasket = (basket: any) => {
    // Get additional data
    let size = null;
    if (screeningOperation && screeningOperation.referenceSize) {
      size = screeningOperation.referenceSize.code;
    }
    
    return (
      <div 
        className={`
          rounded-md p-2 text-center text-xs
          ${basket.positionAssigned 
            ? `${getBasketBorderClass(basket.animalsPerKg)} ${getBasketColorBySize(size)}` 
            : 'border-2 border-dashed border-yellow-500 bg-yellow-50'
          }
          min-h-[120px] flex flex-col justify-between items-center
          ${!basket.positionAssigned ? 'animate-pulse-subtle' : ''}
        `}
      >
        {/* Header con numero fisico cesta */}
        <div className="font-semibold w-full border-b pb-1 text-center">
          <span className="text-base">#{basket.basket.physicalNumber}</span>
          <Badge className="ml-2" variant={basket.category === 'sopravaglio' ? 'default' : 'secondary'}>
            {basket.category === 'sopravaglio' ? 'Sopra' : 'Sotto'}
          </Badge>
        </div>
        
        {/* Corpo con dati principali */}
        <div className="py-1 flex flex-col items-center">
          {size && (
            <div className="font-medium">
              <span className="text-gray-700">Rif:</span> {size}
            </div>
          )}
          
          {basket.animalCount && (
            <div className="text-[10px]">
              <span className="text-gray-700">Animali:</span> {formatNumberWithCommas(basket.animalCount)}
            </div>
          )}
          
          {basket.animalsPerKg && (
            <div className="text-[10px]">
              <span className="text-gray-700">Animali/kg:</span> {formatNumberWithCommas(basket.animalsPerKg)}
            </div>
          )}
        </div>
        
        {/* Footer con stato */}
        <div className="w-full pt-1 border-t text-center">
          <div className={`text-[10px] rounded px-1 ${basket.positionAssigned ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {basket.positionAssigned 
              ? <span>{basket.row}-{basket.position}</span> 
              : <span>In attesa di posizione</span>
            }
          </div>
        </div>
      </div>
    );
  };
  
  // Render source basket card (to be dismissed)
  const renderSourceBasket = (basket: any) => {
    return (
      <div 
        className={`
          rounded-md p-2 text-center text-xs
          ${basket.dismissed
            ? 'border border-red-200 bg-red-50'
            : `${getBasketBorderClass(basket.animalsPerKg)} ${getBasketColorBySize(basket.size?.code)}`
          }
          min-h-[100px] flex flex-col justify-between items-center
          ${basket.dismissed ? 'opacity-50' : ''}
        `}
      >
        {/* Header con numero fisico cesta */}
        <div className="font-semibold w-full border-b pb-1 text-center">
          <span className="text-sm">#{basket.basket.physicalNumber}</span>
        </div>
        
        {/* Corpo con dati principali */}
        <div className="py-1 flex flex-col items-center">
          {basket.size && (
            <div className="text-[10px]">
              <span className="text-gray-700">Taglia:</span> {basket.size.code}
            </div>
          )}
          
          {basket.animalCount && (
            <div className="text-[10px]">
              <span className="text-gray-700">Animali:</span> {formatNumberWithCommas(basket.animalCount)}
            </div>
          )}
        </div>
        
        {/* Footer con stato */}
        <div className="w-full pt-1 border-t text-center">
          <div className={`text-[10px] rounded px-1 ${basket.dismissed ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
            {basket.dismissed 
              ? <span>Dismessa</span> 
              : <span>Da dismettere</span>
            }
          </div>
        </div>
      </div>
    );
  };

  // Render a basket box or empty position in FLUPSY
  const renderBasketBox = (basket: any, position: number, row: 'DX' | 'SX', flupsyId: number) => {
    const isOccupied = !!basket;
        
    return (
      <div 
        className={`
          rounded-md p-2 text-center text-xs
          ${isOccupied 
            ? `border border-gray-300 bg-gray-100` 
            : 'border border-dashed border-gray-300 bg-gray-50'
          }
          min-h-[80px] flex flex-col justify-between items-center
        `}
      >
        {isOccupied ? (
          <>
            {/* Header con numero fisico cesta */}
            <div className="font-semibold w-full text-center">
              <span className="text-sm">#{basket.physicalNumber}</span>
            </div>
            
            {/* Stato */}
            <div className="w-full text-center">
              <div className="text-[10px] rounded px-1 bg-gray-200 text-gray-800">
                <span>Occupato</span>
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
  };

  // Render tooltip content for a basket
  const renderTooltipContent = (basket: any) => {
    if (!basket) return <div>Posizione disponibile</div>;
    
    return (
      <div className="p-2">
        <div className="font-semibold text-sm mb-1">Cesta #{basket.physicalNumber}</div>
        <div className="text-xs">
          <div><span className="font-medium text-gray-700">Posizione:</span> {basket.row || '-'}-{basket.position || '-'}</div>
          <div><span className="font-medium text-gray-700">Stato:</span> {basket.state}</div>
        </div>
      </div>
    );
  };

  // Render a single FLUPSY grid
  const renderFlupsyGrid = (flupsyId: number) => {
    const flupsy = flupsys?.find((f: any) => f.id === flupsyId);
    if (!flupsy || !baskets) return null;
    
    // Get baskets for this FLUPSY
    const flupsyBaskets = baskets.filter((b: any) => b.flupsyId === flupsyId && b.state === 'active');
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
            
            <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                const basket = getFlupsyBasketByPosition('DX', position);
                const isOccupied = !!basket;
                
                return (
                  <TooltipProvider key={`${flupsyId}-dx-${position}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropTarget 
                            flupsyId={flupsyId}
                            row="DX"
                            position={position}
                            onDrop={handlePositionDrop}
                            isOccupied={isOccupied}
                          >
                            {renderBasketBox(basket, position, 'DX', flupsyId)}
                          </DropTarget>
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
            <div className="flex items-center mb-2">
              <Badge variant="secondary" className="mr-2">Fila SX</Badge>
              <Separator className="flex-grow" />
            </div>
            
            <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
              {Array.from({ length: flupsyMaxPositions }).map((_, i) => {
                const position = i + 1;
                const basket = getFlupsyBasketByPosition('SX', position);
                const isOccupied = !!basket;
                
                return (
                  <TooltipProvider key={`${flupsyId}-sx-${position}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropTarget 
                            flupsyId={flupsyId}
                            row="SX"
                            position={position}
                            onDrop={handlePositionDrop}
                            isOccupied={isOccupied}
                          >
                            {renderBasketBox(basket, position, 'SX', flupsyId)}
                          </DropTarget>
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
  
  // Render the destination baskets section
  const renderDestinationBaskets = () => {
    if (isLoadingDestBaskets) {
      return <div className="py-4 text-center">Caricamento dati ceste di destinazione...</div>;
    }
    
    if (!destinationBaskets || destinationBaskets.length === 0) {
      return <div className="py-4 text-center">Nessuna cesta di destinazione configurata</div>;
    }
    
    const unassignedBaskets = destinationBaskets.filter((basket: any) => !basket.positionAssigned);
    const assignedBaskets = destinationBaskets.filter((basket: any) => basket.positionAssigned);
    
    return (
      <>
        {unassignedBaskets.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Badge variant="destructive" className="mr-2">Ceste da posizionare</Badge>
              <Separator className="flex-grow" />
              <Badge variant="outline">{unassignedBaskets.length}</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
              {unassignedBaskets.map((basket: any) => (
                <DraggableBasket key={basket.id} basket={basket}>
                  {renderDestinationBasket(basket)}
                </DraggableBasket>
              ))}
            </div>
          </div>
        )}
        
        {assignedBaskets.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <Badge variant="default" className="mr-2">Ceste posizionate</Badge>
              <Separator className="flex-grow" />
              <Badge variant="outline">{assignedBaskets.length}</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
              {assignedBaskets.map((basket: any) => (
                <div key={basket.id}>
                  {renderDestinationBasket(basket)}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };
  
  // Render the source baskets section with trash
  const renderSourceBaskets = () => {
    if (isLoadingSourceBaskets) {
      return <div className="py-4 text-center">Caricamento dati ceste di origine...</div>;
    }
    
    if (!sourceBaskets || sourceBaskets.length === 0) {
      return <div className="py-4 text-center">Nessuna cesta di origine configurata</div>;
    }
    
    const activeSources = sourceBaskets.filter((basket: any) => !basket.dismissed);
    const dismissedSources = sourceBaskets.filter((basket: any) => basket.dismissed);
    
    return (
      <>
        <div className="flex">
          {/* Active source baskets */}
          <div className="flex-1 mr-4">
            <div className="flex items-center mb-2">
              <Badge variant="secondary" className="mr-2">Ceste di origine</Badge>
              <Separator className="flex-grow" />
              <Badge variant="outline">{sourceBaskets.length}</Badge>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
              {activeSources.map((basket: any) => (
                <DraggableSourceBasket key={basket.id} basket={basket}>
                  {renderSourceBasket(basket)}
                </DraggableSourceBasket>
              ))}
              
              {dismissedSources.map((basket: any) => (
                <div key={basket.id}>
                  {renderSourceBasket(basket)}
                </div>
              ))}
            </div>
          </div>
          
          {/* Trash for dismissal */}
          {activeSources.length > 0 && (
            <div className="w-32">
              <div className="text-center mb-2">
                <Badge variant="destructive" className="mr-2">Cestino</Badge>
              </div>
              
              <TrashDropTarget onDrop={handleTrashDrop}>
                <div className="border-2 border-dashed border-red-300 bg-red-50 rounded-lg h-full min-h-[200px] flex flex-col items-center justify-center p-4">
                  <Trash2 className="h-12 w-12 text-red-400 mb-2" />
                  <div className="text-xs text-center text-red-500">
                    Trascina qui le ceste di origine da dismettere
                  </div>
                </div>
              </TrashDropTarget>
            </div>
          )}
        </div>
      </>
    );
  };

  // Main render
  return (
    <DndProvider backend={HTML5Backend}>
      <Helmet>
        <title>Completa Vagliatura #{screeningOperation?.screeningNumber}</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Completa Vagliatura {screeningOperation && `#${screeningOperation.screeningNumber}`}
            </h1>
            <p className="text-muted-foreground">
              Disponi le ceste di destinazione nei FLUPSY e dismetti le ceste di origine
            </p>
          </div>
          
          <Button 
            onClick={() => navigate(`/screening/${screeningId}`)}
            variant="outline"
          >
            Torna al dettaglio
          </Button>
        </div>
        
        {/* Help message */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Istruzioni:</strong> 
                <br />1. Trascina le ceste di destinazione nelle posizioni disponibili dei FLUPSY
                <br />2. Trascina le ceste di origine nel "Cestino" per dismettere i cicli
                <br />3. Una volta completato il posizionamento di tutte le ceste, clicca su "Completa Vagliatura"
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress indicators */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 ${allPositionsAssigned ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <div className="text-sm font-medium">Posizionamento ceste di destinazione</div>
                  <div className="text-xs text-gray-500">
                    {destinationBaskets 
                      ? `${destinationBaskets.filter((b: any) => b.positionAssigned).length} di ${destinationBaskets.length} completate`
                      : 'Caricamento...'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 ${allSourcesDismissed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div>
                  <div className="text-sm font-medium">Dismissione ceste di origine</div>
                  <div className="text-xs text-gray-500">
                    {sourceBaskets 
                      ? `${sourceBaskets.filter((b: any) => b.dismissed).length} di ${sourceBaskets.length} completate`
                      : 'Caricamento...'
                    }
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Source baskets and Trash */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Ceste da dismettere</CardTitle>
                <CardDescription>
                  Ceste di origine della vagliatura da dismettere. Trascinale nel cestino.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderSourceBaskets()}
              </CardContent>
            </Card>
          </div>
          
          {/* Right 2 columns - Destination baskets and FLUPSY */}
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <CardTitle>Ceste da posizionare</CardTitle>
                <CardDescription>
                  Nuove ceste create dalla vagliatura. Trascinale in una posizione libera del FLUPSY.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderDestinationBaskets()}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>FLUPSY Disponibili</CardTitle>
                <CardDescription>
                  Trascina le ceste nelle posizioni disponibili dei FLUPSY
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  {renderFlupsyGrids()}
                </ScrollArea>
              </CardContent>
              <CardFooter className="border-t p-4">
                <Button 
                  className="w-full"
                  onClick={handleCompleteScreening}
                  disabled={!allPositionsAssigned || !allSourcesDismissed || completeInProgress}
                >
                  {completeInProgress ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completamento in corso...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Completa Vagliatura
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Confirmation dialog for position assignment */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma posizione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler assegnare questa cesta alla posizione 
              {pendingPositionAssignment && ` ${pendingPositionAssignment.row}-${pendingPositionAssignment.position} del FLUPSY ${
                flupsys?.find((f: any) => f.id === pendingPositionAssignment.flupsyId)?.name
              }`}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPositionAssignment}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}