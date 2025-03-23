import { useDrop } from 'react-dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MisurazioneDirectForm from '@/components/MisurazioneDirectForm';
import { useToast } from "@/hooks/use-toast";
import { ChartBarIcon, BeakerIcon, ScissorsIcon, TicketIcon, ScaleIcon, ListFilterIcon } from 'lucide-react';

// Item types for drag and drop
const ItemTypes = {
  BASKET: 'basket'
};

interface BasketDragItem {
  id: number;
  sourceRow: string | null;
  sourcePosition: number | null;
}

interface OperationsDropZoneProps {
  operationType: 'misura' | 'selezione' | 'selezione-vendita' | 'peso' | 'vendita';
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

export default function OperationsDropZone({ 
  operationType, 
  title, 
  description, 
  color,
  icon 
}: OperationsDropZoneProps) {
  const { toast } = useToast();
  const [draggedBasket, setDraggedBasket] = useState<number | null>(null);
  const [showBasketDialog, setShowBasketDialog] = useState(false);
  
  // Query per recuperare l'ultima operazione e altri dati necessari
  const { data: operations } = useQuery({ 
    queryKey: ['/api/operations'],
    enabled: !!draggedBasket
  });

  const { data: baskets } = useQuery({ 
    queryKey: ['/api/baskets'],
    enabled: !!draggedBasket
  });

  const { data: sizes } = useQuery({ 
    queryKey: ['/api/sizes'],
    enabled: !!draggedBasket
  });

  // Drop target implementation
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.BASKET,
    drop: (item: BasketDragItem) => {
      handleBasketDrop(item.id);
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // Ripulisce lo stato quando non è più necessario
  useEffect(() => {
    if (!showBasketDialog) {
      setDraggedBasket(null);
    }
  }, [showBasketDialog]);

  // Gestisce il drop di una cesta nella zona operazione
  const handleBasketDrop = (basketId: number) => {
    setDraggedBasket(basketId);
    setShowBasketDialog(true);
  };

  // Cerca la cesta e l'ultima operazione dal suo ID
  const basket = draggedBasket ? baskets?.find((b: any) => b.id === draggedBasket) : null;
  
  // Trova l'ultima operazione per la cesta
  const getLatestOperation = (basketId: number) => {
    if (!operations) return null;
    
    const basketOperations = operations.filter((op: any) => op.basketId === basketId);
    if (basketOperations.length === 0) return null;
    
    return basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };

  const latestOperation = draggedBasket ? getLatestOperation(draggedBasket) : null;

  // Gestisce la chiusura del dialogo di operazione
  const handleCloseDialog = () => {
    setShowBasketDialog(false);
  };

  // Gestisce il completamento con successo dell'operazione
  const handleOperationSuccess = () => {
    toast({
      title: "Operazione completata",
      description: `L'operazione di ${title.toLowerCase()} è stata registrata con successo.`,
    });
    
    // Aggiorna la cache per riflettere la nuova operazione
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    
    setShowBasketDialog(false);
  };

  return (
    <>
      <div 
        ref={drop} 
        className={`rounded-lg border-2 ${isOver && canDrop ? 'border-green-500 bg-green-50' : `border-dashed border-${color}`} 
                    p-4 flex items-center justify-center flex-col gap-2 min-h-[120px] transition-all
                    ${isOver ? 'transform scale-105' : ''}`}
      >
        <div className={`w-10 h-10 rounded-full bg-${color}/20 flex items-center justify-center text-${color}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-center">{title}</h3>
        <p className="text-xs text-center text-muted-foreground">{description}</p>
        <p className="text-[10px] opacity-75 text-center mt-1">
          Trascina una cesta qui
        </p>
      </div>

      <AlertDialog open={showBasketDialog} onOpenChange={setShowBasketDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {title} - Cesta #{basket?.physicalNumber}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Inserisci i dati per l'operazione di {title.toLowerCase()} per la cesta {basket?.physicalNumber}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Condizionalmente renderizza il form basato sul tipo di operazione */}
          {operationType === 'misura' && basket && latestOperation && (
            <MisurazioneDirectForm 
              basketId={basket.id}
              cycleId={basket.currentCycleId || 0}
              sizeId={latestOperation.sizeId}
              lotId={latestOperation.lotId}
              basketNumber={basket.physicalNumber}
              defaultAnimalsPerKg={latestOperation.animalsPerKg}
              defaultAverageWeight={latestOperation.averageWeight}
              defaultAnimalCount={latestOperation.animalCount}
              onSuccess={handleOperationSuccess}
              onCancel={handleCloseDialog}
            />
          )}
          
          {/* Per il futuro: aggiungere altri form per altri tipi di operazioni */}
          {(operationType !== 'misura' || !basket || !latestOperation) && (
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialog}>Annulla</AlertDialogCancel>
            </AlertDialogFooter>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}