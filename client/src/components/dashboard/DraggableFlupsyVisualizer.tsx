import React, { useState, useEffect, useCallback } from "react";
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
  // Modifica: permettiamo il trascinamento sia per ceste attive che disponibili
  const isDraggable = basket && (basket.state === 'active' || basket.state === 'available');
  
  // Aggiungi un indicatore visivo per i cestelli trascinabili
  const handleMouseDown = () => {
    if (isDraggable) {
      document.body.style.cursor = 'grabbing';
    }
  };
  
  const handleMouseUp = () => {
    document.body.style.cursor = '';
  };
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BASKET,
    item: {
      id: basket.id,
      sourceRow: basket.row,
      sourcePosition: basket.position
    } as BasketDragItem,
    canDrag: isDraggable, // Solo i cestelli attivi possono essere trascinati
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
      }}
      className={`hover:shadow-md transition-shadow duration-200 ${isDraggable ? 'basket-draggable' : ''}`}
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
  onDrop: (item: BasketDragItem, row: string, position: number, flupsyId: number) => void;
  isOccupied: boolean;
  children: React.ReactNode;
}

function DropTarget({ flupsyId, row, position, onDrop, isOccupied, children }: DropTargetProps) {
  // Qui la modifica principale: rendiamo la funzione drop consapevole dello stato di occupazione
  // Il problema era che prima il drop veniva sempre eseguito, ma non stavamo passando
  // l'informazione se è un'operazione di switch o uno spostamento normale
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BASKET,
    drop: (item: BasketDragItem) => {
      // Passiamo anche il flupsyId del target alla funzione onDrop
      // Questo ci permette di gestire correttamente gli spostamenti tra FLUPSY diversi
      return onDrop(item, row, position, flupsyId);
    },
    // Permettiamo sempre il drop, anche su posizioni occupate
    canDrop: () => true,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  // Stile per evidenziare la posizione durante il drag-and-drop
  // Aggiunto supporto per evidenziare diversamente le posizioni occupate
  // ma che supportano lo switch
  let backgroundColor = 'transparent';
  let border = '2px dashed transparent';
  
  if (isOver) {
    // Sempre mostrare bordo quando siamo sopra (indipendentemente se occupato o no)
    if (isOccupied) {
      // Posizione occupata ma possiamo fare switch
      backgroundColor = 'rgba(234, 179, 8, 0.2)'; // Colore giallo per switch
      border = '2px dashed rgba(234, 179, 8, 0.8)';
    } else {
      // Posizione libera, normale drop
      backgroundColor = 'rgba(52, 211, 153, 0.2)'; // Verde per drop normale
      border = '2px dashed rgba(52, 211, 153, 0.8)';
    }
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

// Definizione dell'interfaccia per pendingBasketMove
interface PendingBasketMove {
  basketId: number;
  targetRow: string;
  targetPosition: number;
  flupsyId?: number;
  targetFlupsyId?: number; // Aggiunto per supportare spostamenti tra FLUPSY diversi
  isSwitch?: boolean;
  targetBasketId?: number;
}

// Main component
export default function DraggableFlupsyVisualizer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  const [showFlupsySelector, setShowFlupsySelector] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingBasketMove, setPendingBasketMove] = useState<PendingBasketMove | null>(null);

  // Data queries
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: baskets, isLoading: isLoadingBaskets, refetch: refetchBaskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchOnWindowFocus: true,  // Riaggiorna i dati quando la finestra riprende il focus
    staleTime: 2000, // Considera i dati obsoleti dopo 2 secondi
  });

  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Update basket position mutation
  const updateBasketPosition = useMutation({
    mutationFn: async ({ basketId, flupsyId, row, position }: { basketId: number; flupsyId: number; row: string; position: number }) => {
      console.log('SPOSTAMENTO NORMALE:', basketId, 'a', row, position);
      console.log('Sending basket position update with flupsyId:', flupsyId);
      
      try {
        // Utilizziamo il nuovo endpoint dedicato per lo spostamento dei cestelli
        const response = await apiRequest({
          url: `/api/baskets/${basketId}/move`,
          method: 'POST',
          body: {
            flupsyId,
            row,
            position
          }
        });
        
        console.log("API Response status:", response.status);
        if (typeof response === 'object') {
          console.log("API Response data:", JSON.stringify(response));
        } else {
          console.log("API Response data (non-object):", response);
        }
        
        // Se la posizione è occupata ma l'API ha risposto 200 con positionOccupied=true,
        // è un caso di switch potenziale da gestire
        if (response && response.positionOccupied && response.basketAtPosition) {
          // Ritorna le informazioni sulla posizione occupata per permettere lo switch
          return {
            positionOccupied: true,
            basketAtPosition: response.basketAtPosition,
            message: response.message
          };
        }
        
        // Se la risposta è vuota, success=true, o vuota ma l'API ha risposto 200,
        // consideriamo lo spostamento riuscito e aggiorniamo i dati
        if (response === null || 
            response === undefined || 
            Object.keys(response).length === 0 || 
            (response.success === true && Object.keys(response).length === 1)) {
          console.log("Risposta di successo con dati minimi, refresh dei dati...");
          // Invalidare tutte le query pertinenti per aggiornare l'interfaccia
          queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
          queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
          return { success: true, message: "Cestello spostato con successo" };
        }
        
        return response;
      } catch (error) {
        console.error("Errore durante lo spostamento del cestello:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Controlla se è un caso di posizione occupata
      if (data && data.positionOccupied && data.basketAtPosition) {
        // Non completare ancora l'operazione, ma prepara per uno switch
        const basket1 = baskets && Array.isArray(baskets) ? 
          baskets.find((b: any) => b.id === pendingBasketMove?.basketId) : 
          null;
        
        if (basket1 && pendingBasketMove) {
          // Mostra dialogo di conferma speciale per switch
          setPendingBasketMove({
            ...pendingBasketMove,
            isSwitch: true,
            targetBasketId: data.basketAtPosition.id
          });
          
          toast({
            title: "Posizione occupata",
            description: `La posizione è già occupata dalla cesta #${data.basketAtPosition.physicalNumber}. Conferma per effettuare uno switch.`
          });
        }
      } else {
        // Normale successo - aggiornamento posizione completato
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        
        // Aggiorna immediatamente tutte le query rilevanti senza ricaricare la pagina
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        
        // Forza un refetch attivo per ottenere subito i dati aggiornati
        setTimeout(() => {
          refetchBaskets();
        }, 50);
        
        toast({
          title: "Posizione aggiornata",
          description: "La posizione della cesta è stata aggiornata con successo."
        });
        setConfirmDialogOpen(false);
        setPendingBasketMove(null);
      }
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
    if (flupsys && Array.isArray(flupsys) && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
      // Seleziona tutti i flupsy disponibili invece di solo il primo
      const allFlupsyIds = flupsys.map((flupsy: any) => flupsy.id);
      setSelectedFlupsyIds(allFlupsyIds);
    }
  }, [flupsys, selectedFlupsyIds]);

  // Handle drop event
  const handleBasketDrop = useCallback(async (item: BasketDragItem, targetRow: string, targetPosition: number, dropFlupsyId: number) => {
    if (item.sourceRow === targetRow && item.sourcePosition === targetPosition) {
      return; // No change in position
    }
    
    // Recupera i dati freschi dopo il refetch
    await refetchBaskets();
    const freshBaskets = queryClient.getQueryData(['/api/baskets']) as any[];
    if (!freshBaskets || !Array.isArray(freshBaskets)) {
      console.error("Baskets data not available or not an array after refetch");
      return;
    }
    
    // Otteniamo il cestello che stiamo trascinando dai dati aggiornati
    const sourceBasket = freshBaskets.find((b: any) => b.id === item.id);
    if (!sourceBasket) {
      console.error("Source basket not found in fresh data:", item.id);
      return;
    }
    
    // Verifica attentamente se c'è già un cestello nella posizione target
    // Deve essere un cestello diverso da quello che stiamo trascinando nella posizione target
    // Il cestello deve essere nel FLUPSY target (dropFlupsyId) e nella posizione target
    const targetBasket = freshBaskets.find((b: any) => 
      b.id !== item.id && 
      b.row === targetRow && 
      b.position === targetPosition &&
      b.flupsyId === dropFlupsyId
    );
    
    // Determiniamo il FLUPSY target in base al cestello target o al FLUPSY dell'oggetto DropTarget
    const targetFlupsyId = targetBasket ? targetBasket.flupsyId : dropFlupsyId;
    
    // Assicuriamoci di avere i flupsyId corretti
    const sourceFlupsyId = sourceBasket.flupsyId;
    
    // Log dettagliato
    console.log("=== OPERAZIONE CESTELLO ===");
    console.log("Cestello trascinato:", sourceBasket.physicalNumber, "(ID:", item.id, ")");
    console.log("Da posizione:", item.sourceRow, item.sourcePosition, "FLUPSY:", sourceFlupsyId);
    console.log("A posizione:", targetRow, targetPosition, "FLUPSY:", targetFlupsyId);
    
    if (targetBasket) {
      console.log("Operazione: SCAMBIO con cestello", targetBasket.physicalNumber, "(ID:", targetBasket.id, ")");
    } else {
      console.log("Operazione: SPOSTAMENTO in posizione libera")
    }
    
    if (targetBasket) {
      // Se c'è già una cesta nella posizione target, è un'operazione di switch
      console.log("Setting up switch with basket ID:", targetBasket.id);
      
      // Mostra conferma per lo switch
      setPendingBasketMove({
        basketId: item.id,
        targetRow,
        targetPosition,
        flupsyId: sourceFlupsyId,      // FLUPSY di origine
        targetFlupsyId, // FLUPSY di destinazione (può essere diverso da quello di origine)
        isSwitch: true,
        targetBasketId: targetBasket.id
      });
    } else {
      // Spostamento normale in una posizione vuota
      console.log("Setting up normal move for basket:", item.id);
      
      setPendingBasketMove({
        basketId: item.id,
        targetRow,
        targetPosition,
        flupsyId: sourceFlupsyId,
        targetFlupsyId, // Aggiungiamo anche per i movimenti normali
        isSwitch: false
      });
    }
    
    setConfirmDialogOpen(true);
  }, [queryClient, refetchBaskets]);

  // Handle basket click
  const handleBasketClick = (basket: any) => {
    if (basket) {
      // Navigate to basket details page or open a dialog with details
      console.log("Basket clicked:", basket);
    }
  };

  // Switch basket positions mutation
  const switchBasketPositions = useMutation({
    mutationFn: async ({ 
      basket1Id, 
      basket2Id,
      flupsyId1,
      flupsyId2,
      position1Row,
      position1Number, 
      position2Row,
      position2Number 
    }: { 
      basket1Id: number;
      basket2Id: number;
      flupsyId1: number;
      flupsyId2: number;
      position1Row: string;
      position1Number: number;
      position2Row: string;
      position2Number: number;
    }) => {
      console.log("INIZIO OPERAZIONE DI SCAMBIO CESTELLI");
      console.log("Cestello 1:", basket1Id, "Posizione:", position1Row, position1Number, "FLUPSY:", flupsyId1);
      console.log("Cestello 2:", basket2Id, "Posizione:", position2Row, position2Number, "FLUPSY:", flupsyId2);
      
      try {
        // Utilizziamo il nuovo endpoint dedicato per lo scambio di posizione
        const response = await apiRequest({
          url: '/api/baskets/switch-positions',
          method: 'POST',
          body: {
            basket1Id,
            basket2Id,
            flupsyId1,
            flupsyId2,
            position1Row,
            position1Number,
            position2Row,
            position2Number
          }
        });
        
        console.log("Risultato dell'operazione di scambio:", response);
        return response;
      } catch (error) {
        console.error("ERRORE DURANTE LO SCAMBIO:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      // Aggiorna immediatamente tutte le query rilevanti senza ricaricare la pagina
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      
      // Forza un refetch attivo per ottenere subito i dati aggiornati
      setTimeout(() => {
        refetchBaskets();
      }, 50);
      
      toast({
        title: "Scambio completato",
        description: "Lo scambio delle ceste è stato completato con successo.",
      });
      setConfirmDialogOpen(false);
      setPendingBasketMove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante lo scambio delle ceste.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
      setPendingBasketMove(null);
    }
  });

  // Confirm basket move
  const confirmBasketMove = async () => {
    if (!pendingBasketMove) return;
    
    // Assicuriamoci di avere dati aggiornati prima di continuare
    await refetchBaskets();
    const freshBaskets = queryClient.getQueryData(['/api/baskets']) as any[];
    
    if (pendingBasketMove.isSwitch && pendingBasketMove.targetBasketId) {
      // Caso di switch tra due cestelli
      const basket1 = freshBaskets && Array.isArray(freshBaskets) ? 
        freshBaskets.find((b: any) => b.id === pendingBasketMove.basketId) : 
        null;
      const basket2 = freshBaskets && Array.isArray(freshBaskets) ? 
        freshBaskets.find((b: any) => b.id === pendingBasketMove.targetBasketId) : 
        null;
      
      console.log("Attempting to switch baskets:", basket1, basket2);
      
      if (!basket1 || !basket2) {
        toast({
          title: "Errore",
          description: "Impossibile trovare i cestelli da scambiare.",
          variant: "destructive",
        });
        setConfirmDialogOpen(false);
        setPendingBasketMove(null);
        return;
      }
      
      console.log("Switch parameters:", {
        basket1Id: basket1.id,
        basket2Id: basket2.id,
        position1Row: basket1.row,
        position1Number: basket1.position,
        position2Row: basket2.row,
        position2Number: basket2.position
      });
      
      // Assicuriamoci che flupsyId sia disponibile
      let flupsyId = basket1.flupsyId;
      
      // Se per qualche motivo flupsyId non è disponibile, usa un valore di fallback intelligente
      if (!flupsyId && flupsys && Array.isArray(flupsys) && flupsys.length > 0) {
        flupsyId = flupsys[0].id;
        console.warn("FlupsyId non trovato nel cestello, usando il primo FLUPSY disponibile:", flupsyId);
      }
      
      if (!flupsyId) {
        toast({
          title: "Errore",
          description: "Impossibile determinare a quale FLUPSY appartengono i cestelli.",
          variant: "destructive",
        });
        setConfirmDialogOpen(false);
        setPendingBasketMove(null);
        return;
      }
      
      // Eseguiamo lo scambio
      switchBasketPositions.mutate({
        basket1Id: basket1.id,
        basket2Id: basket2.id,
        flupsyId1: basket1.flupsyId,
        flupsyId2: basket2.flupsyId,
        position1Row: basket1.row || "",
        position1Number: basket1.position || 0,
        position2Row: basket2.row || "",
        position2Number: basket2.position || 0
      });
    } else {
      // Caso normale: sposta un cestello in una posizione vuota
      const basket = freshBaskets && Array.isArray(freshBaskets) ? 
        freshBaskets.find((b: any) => b.id === pendingBasketMove.basketId) : 
        null;
      if (!basket) {
        toast({
          title: "Errore",
          description: "Impossibile trovare il cestello da spostare.",
          variant: "destructive",
        });
        setConfirmDialogOpen(false);
        setPendingBasketMove(null);
        return;
      }
      
      console.log("SPOSTAMENTO NORMALE:", pendingBasketMove.basketId, "a", pendingBasketMove.targetRow, pendingBasketMove.targetPosition);
      
      // Usiamo targetFlupsyId che ora è incluso in pendingBasketMove, altrimenti flupsyId del cestello come fallback
      let targetFlupsyId = pendingBasketMove.targetFlupsyId || basket.flupsyId;
      
      console.log("Spostamento cestello:", {
        basketId: pendingBasketMove.basketId,
        flupsyId: targetFlupsyId,
        row: pendingBasketMove.targetRow,
        position: pendingBasketMove.targetPosition
      });
      
      // Eseguiamo lo spostamento
      updateBasketPosition.mutate({
        basketId: pendingBasketMove.basketId,
        flupsyId: targetFlupsyId,
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
    let averageWeight = null;
    let startDate = null;
    
    // Determina se il cestello è trascinabile per applicare indicazioni visive
    // Modificato: permettiamo il trascinamento sia per ceste attive che disponibili
    const isDraggable = basket && (basket.state === 'active' || basket.state === 'available');
    
    if (isOccupied) {
      // Get latest operation for this basket
      const basketOperations = operations && Array.isArray(operations)
        ? operations
            .filter((op: any) => op.basketId === basket.id)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      latestOperation = basketOperations.length > 0 ? basketOperations[0] : null;
      
      // Get cycle data
      if (basket.currentCycleId) {
        const cycles = queryClient.getQueryData(['api/cycles']);
        cycle = cycles && Array.isArray(cycles) ? 
          cycles.find((c: any) => c.id === basket.currentCycleId) : 
          null;
        if (cycle) {
          startDate = new Date(cycle.startDate);
        }
      }
      
      // Get size, average weight and animal count from latest operation
      if (latestOperation) {
        size = latestOperation.size?.code;
        animalCount = latestOperation.animalCount;
        // Utilizziamo il peso medio direttamente dal campo averageWeight se disponibile
        averageWeight = latestOperation.averageWeight ? parseFloat(latestOperation.averageWeight) : null;
        
        // Se averageWeight non è disponibile ma abbiamo animalsPerKg, lo calcoliamo
        if ((!averageWeight || averageWeight === 0) && latestOperation.animalsPerKg) {
          const animalsPerKgValue = parseFloat(latestOperation.animalsPerKg);
          if (animalsPerKgValue > 0) {
            averageWeight = Math.round(1000000 / animalsPerKgValue);
            console.log('Basket', basket.id, 'calcolato peso medio:', averageWeight, 'da animalsPerKg:', animalsPerKgValue);
          }
        }
        
        // Log di debug per verificare i valori
        console.log('Basket', basket.id, 'Peso medio:', averageWeight, 'AnimalsPerKg:', latestOperation.animalsPerKg);
        
        if (!animalCount && latestOperation.animalsPerKg) {
          // Calcola il numero di animali solo se non è già presente nel campo animalCount
          const totalWeight = latestOperation.totalWeight || 0;
          if (totalWeight > 0) {
            // totalWeight è in grammi, convertiamo in kg e moltiplichiamo per animali/kg
            animalCount = Math.round((totalWeight / 1000) * parseFloat(latestOperation.animalsPerKg));
          }
        }
      }
    }
    
      // Rimosso log di debug
    
    const content = (
      <div 
        className={`
          rounded-md p-2 text-center text-xs
          ${isOccupied 
            ? `${getBasketBorderClass(latestOperation?.animalsPerKg)} ${getBasketColorBySize(size)}` 
            : 'border border-dashed border-gray-300 bg-gray-50'
          }
          min-h-[120px] flex flex-col justify-between items-center
          ${isDraggable ? 'basket-draggable' : ''}
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
              
              {/* Peso medio */}
              {averageWeight && (
                <div className="text-[10px]">
                  <span className="text-gray-700">Peso medio:</span> {formatNumberWithCommas(Math.round(averageWeight * 1000))} mg
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

  // Render a single FLUPSY layout
  const renderFlupsyLayout = (flupsyId: number) => {
    if (!flupsys || !Array.isArray(flupsys) || !baskets || !Array.isArray(baskets)) return null;
    
    const flupsy = flupsys.find(f => f.id === flupsyId);
    if (!flupsy) return null;
    
    // Get baskets for this FLUPSY
    const flupsyBaskets = baskets.filter(b => b.flupsyId === flupsyId);
    // Utilizziamo maxPositions dal FLUPSY o default a 10 se non definito
    const maxPositions = flupsy.maxPositions || 10;
    
    // Calcola il numero di posizioni per riga (sempre diviso in 2 file di uguale lunghezza)
    const positionsPerRow = Math.ceil(maxPositions / 2);
    // Crea un array con le posizioni per ogni fila
    const positions = Array.from({ length: positionsPerRow }, (_, i) => i + 1);
    
    return (
      <Card className="mb-6">
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center gap-2">
              <Fan className="h-5 w-5" /> {flupsy.name}
            </CardTitle>
            <div className="text-xs text-gray-500 flex flex-col items-end">
              <div>{flupsy.location}</div>
              {flupsy.description && <div>{flupsy.description}</div>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Layout per le posizioni - due righe orizzontali di 10 ceste ciascuna */}
          <div className="flex flex-col gap-8">
            {/* Lato DX - mostrato prima perché dall'alto guardando verso l'elica */}
            <div>
              <div className="mb-2 font-semibold flex items-center">
                <Wind className="h-4 w-4 mr-1" /> Lato DX
              </div>
              <div className="grid gap-2" style={{ 
                gridTemplateColumns: `repeat(${positionsPerRow}, minmax(0, 1fr))` 
              }}>
                {positions.map(position => {
                  const basket = flupsyBaskets.find(b => b.row === 'DX' && b.position === position);
                  return (
                    <React.Fragment key={`DX-${position}-${flupsyId}`}>
                      {renderBasketBox(basket, position, 'DX', flupsyId)}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            
            {/* Lato SX - mostrato sotto perché dall'alto guardando verso l'elica */}
            <div>
              <div className="mb-2 font-semibold flex items-center">
                <Wind className="h-4 w-4 mr-1" /> Lato SX
              </div>
              <div className="grid gap-2" style={{ 
                gridTemplateColumns: `repeat(${positionsPerRow}, minmax(0, 1fr))` 
              }}>
                {positions.map(position => {
                  const basket = flupsyBaskets.find(b => b.row === 'SX' && b.position === position);
                  return (
                    <React.Fragment key={`SX-${position}-${flupsyId}`}>
                      {renderBasketBox(basket, position, 'SX', flupsyId)}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render menu for selecting FLUPSY
  const renderFlupsyMenu = () => {
    if (!flupsys || !Array.isArray(flupsys)) return null;
    
    return (
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer" onClick={() => setShowFlupsySelector(!showFlupsySelector)}>
              <Filter className="h-3 w-3 mr-1" />
              {showFlupsySelector ? "Nascondi filtri" : "Visualizza filtri"}
            </Badge>
            
            {showFlupsySelector && (
              <>
                <Separator orientation="vertical" className="h-6" />
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className={`text-xs px-2 py-0 h-6 ${selectedFlupsyIds.length === flupsys.length ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedFlupsyIds(flupsys.map(f => f.id))}
                >
                  Tutti
                </Button>
                
                {flupsys.map(flupsy => (
                  <Button
                    key={flupsy.id}
                    size="sm"
                    variant="ghost"
                    className={`text-xs px-2 py-0 h-6 ${selectedFlupsyIds.includes(flupsy.id) ? 'bg-primary/10' : ''}`}
                    onClick={() => {
                      if (selectedFlupsyIds.includes(flupsy.id)) {
                        setSelectedFlupsyIds(selectedFlupsyIds.filter(id => id !== flupsy.id));
                      } else {
                        setSelectedFlupsyIds([...selectedFlupsyIds, flupsy.id]);
                      }
                    }}
                  >
                    {flupsy.name}
                  </Button>
                ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Loading state
  if (isLoadingFlupsys || isLoadingBaskets) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="mt-2 text-sm text-gray-500">Caricamento in corso...</span>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {renderFlupsyMenu()}
      
      {/* Render selected FLUPSY layouts */}
      {selectedFlupsyIds.map(flupsyId => (
        <React.Fragment key={`flupsy-layout-${flupsyId}`}>
          {renderFlupsyLayout(flupsyId)}
        </React.Fragment>
      ))}
      
      {/* Confirmation dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBasketMove?.isSwitch ? "Conferma scambio cestelli" : "Conferma spostamento cestello"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBasketMove?.isSwitch 
                ? "Sei sicuro di voler scambiare le posizioni dei due cestelli?"
                : "Sei sicuro di voler spostare il cestello nella nuova posizione?"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBasketMove}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}