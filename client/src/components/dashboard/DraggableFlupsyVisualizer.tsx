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
  // Forza un refetch dei dati per garantire che il drag usi info aggiornate
  const queryClient = useQueryClient();
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BASKET,
    // Ogni volta che inizia il dragging, prendiamo i valori attuali del cestello direttamente dalla cache
    item: () => {
      // Ottieniamo i dati più aggiornati prima di iniziare il dragging
      const freshBaskets = queryClient.getQueryData(['/api/baskets']) as any[] || [];
      const freshBasket = freshBaskets.find((b: any) => b.id === basket.id) || basket;
      
      return { 
        id: freshBasket.id, 
        sourceRow: freshBasket.row, 
        sourcePosition: freshBasket.position
      } as BasketDragItem;
    },
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
  onDrop: (item: BasketDragItem, row: string, position: number, flupsyId: number) => void;
  isOccupied: boolean;
  children: React.ReactNode;
}

function DropTarget({ flupsyId, row, position, onDrop, isOccupied, children }: DropTargetProps) {
  // Forza un refetch dei dati per garantire che l'operazione di drag-and-drop usi info aggiornate
  const queryClient = useQueryClient();
  
  // Qui la modifica principale: rendiamo la funzione drop consapevole dello stato di occupazione
  // Il problema era che prima il drop veniva sempre eseguito, ma non stavamo passando
  // l'informazione se è un'operazione di switch o uno spostamento normale
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BASKET,
    drop: async (item: BasketDragItem) => {
      // Forziamo un refetch dei dati più recenti prima di determinare l'operazione
      await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
      
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
        
        // Forza un aggiornamento completo dei dati
        setTimeout(() => {
          window.location.reload();
        }, 500);
        
        toast({
          title: "Posizione aggiornata",
          description: "La posizione della cesta è stata aggiornata con successo. La pagina verrà ricaricata per aggiornare le visualizzazioni."
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
    if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
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
    
    // Prima di tutto, forziamo un refresh dei dati dei cestelli per garantire di avere i dati più aggiornati
    // Questo evita problemi di sincronizzazione tra frontend e backend
    await refetchBaskets();
    
    // Recupera i dati freschi dopo il refetch
    // Nota: getQueryData restituisce i dati più aggiornati dalla cache dopo il refetch
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
  }, [baskets]);

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
      
      // Forza un aggiornamento completo dei dati dopo lo switch
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
      toast({
        title: "Scambio completato",
        description: "Lo scambio delle ceste è stato completato con successo. La pagina verrà ricaricata per aggiornare le visualizzazioni.",
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
      const basket1 = freshBaskets?.find((b: any) => b.id === pendingBasketMove.basketId);
      const basket2 = freshBaskets?.find((b: any) => b.id === pendingBasketMove.targetBasketId);
      
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
      if (!flupsyId && flupsys && flupsys.length > 0) {
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
      const basket = freshBaskets?.find((b: any) => b.id === pendingBasketMove.basketId);
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
    // Prima di renderizzare, forziamo un refresh completo dei dati dal server
    // per assicurarci di avere i dati più aggiornati
    const refreshBaskets = async () => {
      await refetchBaskets();
    };
    
    // Chiamiamo il refresh all'inizio del rendering
    useEffect(() => {
      refreshBaskets();
    }, [flupsyId]);
    
    const flupsy = flupsys?.find((f: any) => f.id === flupsyId);
    if (!flupsy || !baskets) return null;
    
    // Otteniamo i dati più aggiornati prima di procedere
    const freshBaskets = queryClient.getQueryData(['/api/baskets']) as any[] || [];
    
    // Get baskets for this FLUPSY - usiamo freshBaskets invece di baskets
    const flupsyBaskets = freshBaskets.filter((b: any) => b.flupsyId === flupsyId);
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
            <AlertDialogTitle>
              {pendingBasketMove?.isSwitch ? "Conferma scambio" : "Conferma spostamento"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBasketMove?.isSwitch 
                ? "Vuoi fare switch?"
                : "Vuoi spostare la cesta nella nuova posizione?"
              }
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