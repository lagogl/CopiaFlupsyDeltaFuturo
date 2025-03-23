import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Scale,
  Scissors,
  Ruler,
  ShoppingBag,
  Trash2,
  Check,
  LifeBuoy,
  Brush,
  Droplets,
  PanelLeft
} from "lucide-react";
import { calculateAverageWeight, getOperationTypeLabel } from "@/lib/utils";

// Definiamo i tipi di operazione che possono essere trascinati
type DraggableOperationType = 
  | "misura" 
  | "peso" 
  | "selezione" 
  | "vendita" 
  | "selezione-vendita"
  | "pulizia"
  | "trattamento"
  | "cessazione";

interface OperationsDropZoneContainerProps {
  flupsyId: number;
}

interface DraggableOperationItemProps {
  type: DraggableOperationType;
  icon: React.ReactNode;
  label: string;
}

// Componente per l'elemento trascinabile
const DraggableOperationItem = ({ type, icon, label }: DraggableOperationItemProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'OPERATION',
    item: { type },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`rounded-lg p-4 border bg-white shadow-sm cursor-grab transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-primary">{icon}</div>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
};

// Componente per il target (cesta) dove rilasciare l'operazione
const DropTargetBasket = ({ basket, operations, onOperationDrop }: any) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'OPERATION',
    drop: (item: { type: DraggableOperationType }) => {
      onOperationDrop(basket.id, item.type);
      return { basket };
    },
    canDrop: () => basket.state === 'active' && basket.currentCycleId !== null,
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  // Trova l'ultima operazione per questa cesta
  const lastOperation = operations && operations.length > 0 
    ? operations.filter((op: any) => op.basketId === basket.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  
  // Calcola il numero di animali per kg e il peso medio se disponibile
  const animalsPerKg = lastOperation?.animalsPerKg || null;
  const averageWeight = lastOperation?.averageWeight || null;

  // Calcola la classe del bordo in base al numero di animali per kg
  const getBorderClass = () => {
    if (!animalsPerKg) return 'border-gray-200';
    
    // Stessa logica che usiamo altrove per il colore del bordo
    if (animalsPerKg <= 1000) return 'border-red-500 border-2';
    if (animalsPerKg <= 2000) return 'border-orange-500 border-2';
    if (animalsPerKg <= 5000) return 'border-yellow-500 border-2';
    if (animalsPerKg <= 10000) return 'border-green-500 border-2';
    if (animalsPerKg <= 20000) return 'border-blue-500 border-2';
    return 'border-indigo-500 border-2';
  };

  return (
    <div
      ref={drop}
      className={`relative rounded-lg p-4 ${getBorderClass()} ${
        isOver && canDrop ? 'bg-blue-50' : 'bg-white'
      } ${!canDrop ? 'opacity-60' : 'opacity-100'}`}
      style={{ minHeight: '90px' }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold">
            Cesta #{basket.physicalNumber}
            {basket.row && basket.position ? ` (${basket.row}-${basket.position})` : ''}
          </div>
          {lastOperation && (
            <div className="text-xs text-gray-500">
              Ultima op: {getOperationTypeLabel(lastOperation.type)} - {new Date(lastOperation.date).toLocaleDateString()}
            </div>
          )}
        </div>
        {animalsPerKg && (
          <div className="text-xs text-right">
            <div>{animalsPerKg.toLocaleString('it-IT')} pz/kg</div>
            {averageWeight && (
              <div>{averageWeight.toLocaleString('it-IT')} mg</div>
            )}
          </div>
        )}
      </div>
      
      {!canDrop && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg">
          <span className="text-xs text-gray-500 font-medium">Non disponibile</span>
        </div>
      )}
    </div>
  );
};

// Componente principale
export default function OperationsDropZoneContainer({ flupsyId }: OperationsDropZoneContainerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stato per i dialoghi
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<{
    basketId: number;
    type: DraggableOperationType;
    formData: any;
  } | null>(null);

  // Carica dati delle ceste, operazioni e cicli
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Mutation per creare una nuova operazione
  const createOperationMutation = useMutation({
    mutationFn: async (operationData: any) => {
      return apiRequest("/api/operations", "POST", JSON.stringify(operationData));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata registrata con successo",
      });
      setOperationDialogOpen(false);
      setCurrentOperation(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Filtra le ceste per il FLUPSY selezionato
  const filteredBaskets = baskets 
    ? baskets.filter((basket: any) => basket.flupsyId === flupsyId)
    : [];

  // Gestisce il rilascio di un'operazione su una cesta
  const handleOperationDrop = useCallback(
    (basketId: number, operationType: DraggableOperationType) => {
      // Trova il ciclo attivo per questa cesta
      const basket = baskets?.find((b: any) => b.id === basketId);
      if (!basket || basket.currentCycleId === null) {
        toast({
          title: "Impossibile eseguire l'operazione",
          description: "La cesta non ha un ciclo attivo",
          variant: "destructive",
        });
        return;
      }

      // Trova l'ultima operazione per questa cesta
      const basketOperations = operations 
        ? operations.filter((op: any) => op.basketId === basketId)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      
      const lastOperation = basketOperations.length > 0 ? basketOperations[0] : null;

      // Prepara i dati iniziali per il form
      const initialFormData = {
        date: new Date().toISOString().split('T')[0],
        basketId,
        cycleId: basket.currentCycleId,
        type: operationType,
        sampleWeight: null,
        sampleCount: null,
        totalWeight: null,
        deadCount: lastOperation?.deadCount || null,
        mortalityRate: lastOperation?.mortalityRate || null,
        animalsPerKg: lastOperation?.animalsPerKg || null,
        averageWeight: lastOperation?.averageWeight || null,
        animalCount: lastOperation?.animalCount || null,
        notes: ""
      };

      setCurrentOperation({
        basketId,
        type: operationType,
        formData: initialFormData
      });
      setOperationDialogOpen(true);
    },
    [baskets, operations, toast]
  );

  // Gestisce i cambiamenti nei campi del form
  const handleFormChange = (field: string, value: any) => {
    if (!currentOperation) return;

    const updatedFormData = { ...currentOperation.formData, [field]: value };
    
    // Calcoli automatici per l'operazione di misura
    if (currentOperation.type === 'misura' && field === 'sampleWeight' || field === 'sampleCount') {
      const sampleWeight = field === 'sampleWeight' ? parseFloat(value) : parseFloat(currentOperation.formData.sampleWeight);
      const sampleCount = field === 'sampleCount' ? parseInt(value) : parseInt(currentOperation.formData.sampleCount);
      
      if (!isNaN(sampleWeight) && !isNaN(sampleCount) && sampleWeight > 0 && sampleCount > 0) {
        // Calcola animali per kg (proporzionale: sampleCount:sampleWeight = x:1000)
        const animalsPerKg = Math.round((sampleCount * 1000) / sampleWeight);
        updatedFormData.animalsPerKg = animalsPerKg;
        
        // Calcola peso medio in mg
        updatedFormData.averageWeight = Math.round((sampleWeight * 1000) / sampleCount);
        
        // Se c'è anche il peso totale, aggiorna il conteggio stimato
        if (updatedFormData.totalWeight) {
          const totalWeightGrams = parseFloat(updatedFormData.totalWeight);
          if (!isNaN(totalWeightGrams) && totalWeightGrams > 0) {
            updatedFormData.animalCount = Math.round((animalsPerKg * totalWeightGrams) / 1000);
          }
        }
      }
    }
    
    // Aggiorna il peso totale e calcola il numero di animali
    if (field === 'totalWeight' && updatedFormData.animalsPerKg) {
      const totalWeightGrams = parseFloat(value);
      if (!isNaN(totalWeightGrams) && totalWeightGrams > 0) {
        updatedFormData.animalCount = Math.round((updatedFormData.animalsPerKg * totalWeightGrams) / 1000);
      }
    }

    setCurrentOperation({
      ...currentOperation,
      formData: updatedFormData
    });
  };

  // Gestisce il submit del form
  const handleFormSubmit = () => {
    if (!currentOperation) return;
    
    // Verifica che i campi necessari siano compilati
    if (currentOperation.type === 'misura') {
      const { sampleWeight, sampleCount, totalWeight, animalsPerKg, averageWeight } = currentOperation.formData;
      
      if (!sampleWeight || !sampleCount || !totalWeight || !animalsPerKg || !averageWeight) {
        toast({
          title: "Dati incompleti",
          description: "Compila tutti i campi richiesti",
          variant: "destructive",
        });
        return;
      }
    }
    
    setConfirmDialogOpen(true);
  };

  // Gestisce la conferma dell'operazione
  const handleConfirmOperation = () => {
    if (!currentOperation) return;
    
    // Prepara i dati per l'API
    const operationData = {
      ...currentOperation.formData,
      sampleWeight: currentOperation.formData.sampleWeight ? parseFloat(currentOperation.formData.sampleWeight) : null,
      sampleCount: currentOperation.formData.sampleCount ? parseInt(currentOperation.formData.sampleCount) : null,
      totalWeight: currentOperation.formData.totalWeight ? parseFloat(currentOperation.formData.totalWeight) : null,
      deadCount: currentOperation.formData.deadCount ? parseInt(currentOperation.formData.deadCount) : null,
      // Assicurati che tutti i valori numerici siano effettivamente numeri
      animalsPerKg: currentOperation.formData.animalsPerKg ? parseInt(currentOperation.formData.animalsPerKg) : null,
      averageWeight: currentOperation.formData.averageWeight ? parseFloat(currentOperation.formData.averageWeight) : null,
      animalCount: currentOperation.formData.animalCount ? parseInt(currentOperation.formData.animalCount) : null,
    };
    
    // Invia la richiesta
    createOperationMutation.mutate(operationData);
    setConfirmDialogOpen(false);
  };

  // Lista delle operazioni disponibili
  const operationItems: { type: DraggableOperationType; icon: React.ReactNode; label: string }[] = [
    { type: 'misura', icon: <Ruler className="h-8 w-8" />, label: 'Misura' },
    { type: 'peso', icon: <Scale className="h-8 w-8" />, label: 'Peso' },
    { type: 'selezione', icon: <Scissors className="h-8 w-8" />, label: 'Selezione' },
    { type: 'vendita', icon: <ShoppingBag className="h-8 w-8" />, label: 'Vendita' },
    { type: 'selezione-vendita', icon: <PanelLeft className="h-8 w-8" />, label: 'Selezione/Vendita' },
    { type: 'pulizia', icon: <Brush className="h-8 w-8" />, label: 'Pulizia' },
    { type: 'trattamento', icon: <Droplets className="h-8 w-8" />, label: 'Trattamento' },
    { type: 'cessazione', icon: <Trash2 className="h-8 w-8" />, label: 'Cessazione' }
  ];

  return (
    <div className="space-y-6">
      {/* Pannello delle operazioni trascinabili */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <h3 className="font-medium mb-3">Operazioni disponibili</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {operationItems.map((item) => (
            <DraggableOperationItem
              key={item.type}
              type={item.type}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </div>

      {/* Griglia delle ceste */}
      <div>
        <h3 className="font-medium mb-3">Ceste del FLUPSY</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBaskets.map((basket: any) => (
            <DropTargetBasket
              key={basket.id}
              basket={basket}
              operations={operations}
              onOperationDrop={handleOperationDrop}
            />
          ))}
        </div>
      </div>

      {/* Dialog per inserire i dati dell'operazione */}
      <Dialog open={operationDialogOpen} onOpenChange={setOperationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentOperation && getOperationTypeLabel(currentOperation.type)}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati richiesti per completare l'operazione
            </DialogDescription>
          </DialogHeader>

          {currentOperation && currentOperation.type === 'misura' && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sampleWeight">Peso campione (g)</Label>
                  <Input
                    id="sampleWeight"
                    type="number"
                    step="0.01"
                    value={currentOperation.formData.sampleWeight || ''}
                    onChange={(e) => handleFormChange('sampleWeight', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="sampleCount">Animali contati</Label>
                  <Input
                    id="sampleCount"
                    type="number"
                    value={currentOperation.formData.sampleCount || ''}
                    onChange={(e) => handleFormChange('sampleCount', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="totalWeight">Peso totale (g)</Label>
                <Input
                  id="totalWeight"
                  type="number"
                  step="0.01"
                  value={currentOperation.formData.totalWeight || ''}
                  onChange={(e) => handleFormChange('totalWeight', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="deadCount">Animali morti</Label>
                <Input
                  id="deadCount"
                  type="number"
                  value={currentOperation.formData.deadCount || ''}
                  onChange={(e) => handleFormChange('deadCount', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={currentOperation.formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                />
              </div>

              {/* Risultati calcolati */}
              {currentOperation.formData.animalsPerKg && (
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Animali per kg</p>
                        <p className="font-medium">
                          {currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Peso medio (mg)</p>
                        <p className="font-medium">
                          {currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Numero totale animali</p>
                        <p className="font-medium">
                          {currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOperationDialogOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" onClick={handleFormSubmit}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma operazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler registrare questa operazione? 
              {currentOperation?.formData.animalCount && (
                <p className="mt-2">
                  Registrerai {currentOperation.formData.animalCount.toLocaleString('it-IT')} animali 
                  con peso medio di {currentOperation.formData.averageWeight?.toLocaleString('it-IT')} mg.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOperation}>Conferma</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Importa gli hook di react-dnd
import { useDrag, useDrop } from 'react-dnd';