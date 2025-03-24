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
  PanelLeft,
  Tag
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
      className={`rounded-lg p-4 border bg-gradient-to-b from-white to-gray-50 shadow-md cursor-grab transition-all ${
        isDragging ? 'opacity-50 scale-105' : 'opacity-100'
      } hover:shadow-lg hover:scale-105 group`}
      style={{ 
        transformOrigin: 'center top',
        borderWidth: '1px' 
      }}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-primary group-hover:text-primary-dark transform group-hover:rotate-12 transition-all" 
             style={{ filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.2))' }}>
          {icon}
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
};

// Componente per il target (cesta) dove rilasciare l'operazione
const DropTargetBasket = ({ basket, operations, onOperationDrop }: any) => {
  // Verifica diretta se la cesta è disponibile per le operazioni
  const isBasketAvailable = basket.state === 'active' && basket.currentCycleId !== null;
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'OPERATION',
    drop: (item: { type: DraggableOperationType }) => {
      onOperationDrop(basket.id, item.type);
      return { basket };
    },
    canDrop: () => {
      console.log("Basket state:", basket.state, "currentCycleId:", basket.currentCycleId);
      return isBasketAvailable;
    },
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

  // Calcola la classe del background in base a isBasketAvailable e isOver
  const getBackgroundClass = () => {
    if (!isBasketAvailable) return 'bg-gray-50';
    if (isOver) return 'bg-blue-100';
    return 'bg-white hover:bg-slate-50';
  };

  return (
    <div
      ref={drop}
      className={`relative rounded-lg p-3 ${getBorderClass()} ${getBackgroundClass()} 
        ${!isBasketAvailable ? 'opacity-70' : 'opacity-100'} 
        transition-all duration-200 shadow-sm hover:shadow-md
        ${isBasketAvailable ? 'transform hover:-translate-y-1' : ''}`}
      style={{ 
        minHeight: '120px',
        backgroundImage: isBasketAvailable ? 'radial-gradient(circle at center, rgba(255,255,255,1) 50%, rgba(240,240,250,0.8) 100%)' : 'none' 
      }}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="font-bold text-slate-800 mb-2 truncate">
            Cesta #{basket.physicalNumber}
            {basket.row && basket.position ? ` (${basket.row}-${basket.position})` : ''}
          </div>
          
          <div className="grid grid-cols-2 gap-1 mb-2">
            {animalsPerKg && (
              <div className="bg-blue-50 px-2 py-1 rounded border border-blue-100">
                <div className="text-xs font-medium text-center">
                  {animalsPerKg.toLocaleString('it-IT')} pz/kg
                </div>
              </div>
            )}
            
            {averageWeight && (
              <div className="bg-green-50 px-2 py-1 rounded border border-green-100">
                <div className="text-xs font-medium text-center">
                  {averageWeight.toLocaleString('it-IT')} mg
                </div>
              </div>
            )}
          </div>
        </div>
        
        {lastOperation && (
          <div className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 mt-1 border border-slate-100">
            <span className="font-medium">Ultima op:</span><br />
            {getOperationTypeLabel(lastOperation.type)}<br />
            <span className="text-slate-500 text-[10px]">{new Date(lastOperation.date).toLocaleDateString('it-IT')}</span>
          </div>
        )}
      </div>
      
      {!isBasketAvailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg">
          <span className="text-xs text-gray-600 font-medium bg-gray-100 px-2 py-1 rounded">Non disponibile</span>
        </div>
      )}
      
      {isOver && isBasketAvailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-40 rounded-lg border-2 border-blue-300 border-dashed">
          <span className="text-xs text-blue-700 font-medium px-2 py-1 rounded">Rilascia qui</span>
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
      return apiRequest("POST", "/api/operations", operationData);
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
        lotId: lastOperation?.lotId || null,  // Includi il lotto dall'ultima operazione
        sizeId: lastOperation?.sizeId || null, // Includi anche la taglia
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
      <div className="bg-gradient-to-r from-slate-100 to-blue-50 p-4 rounded-lg border shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-slate-800">
            <span className="inline-block mr-2">🖌️</span>
            Operazioni disponibili
          </h3>
          <div className="text-xs text-slate-500 italic">Trascina l'operazione sulla cesta desiderata</div>
        </div>
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
              {/* Dati precedenti dell'operazione */}
              {currentOperation.formData.animalsPerKg && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Dati precedenti</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-blue-600 font-medium">Animali per kg:</span>
                      <span className="ml-1 text-blue-900">{currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}</span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Peso medio:</span>
                      <span className="ml-1 text-blue-900">{currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'} mg</span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Tot. animali:</span>
                      <span className="ml-1 text-blue-900">{currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}</span>
                    </div>
                  </div>
                  {currentOperation.formData.lotId && (
                    <div className="mt-2 bg-blue-100 p-2 rounded text-xs flex items-center">
                      <Tag className="h-3 w-3 mr-1" />
                      <span className="text-blue-600 font-medium">Lotto:</span>
                      <span className="ml-1 text-blue-900">ID: {currentOperation.formData.lotId}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Form per la nuova misurazione */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <h4 className="text-sm font-medium mb-3">Campione</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="sampleWeight" className="text-xs">Peso campione (g)</Label>
                      <Input
                        id="sampleWeight"
                        type="number"
                        step="0.01"
                        placeholder="Inserisci il peso in grammi"
                        value={currentOperation.formData.sampleWeight || ''}
                        onChange={(e) => handleFormChange('sampleWeight', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sampleCount" className="text-xs">Numero animali nel campione</Label>
                      <Input
                        id="sampleCount"
                        type="number"
                        placeholder="Inserisci il numero contato"
                        value={currentOperation.formData.sampleCount || ''}
                        onChange={(e) => handleFormChange('sampleCount', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="text-sm font-medium mb-3">Dati totali</h4>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="totalWeight" className="text-xs">Peso totale degli animali (g)</Label>
                      <Input
                        id="totalWeight"
                        type="number"
                        step="0.01"
                        placeholder="Inserisci il peso totale in grammi"
                        value={currentOperation.formData.totalWeight || ''}
                        onChange={(e) => handleFormChange('totalWeight', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadCount" className="text-xs">Numero animali morti</Label>
                      <Input
                        id="deadCount"
                        type="number"
                        placeholder="Animali trovati morti"
                        value={currentOperation.formData.deadCount || ''}
                        onChange={(e) => handleFormChange('deadCount', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  placeholder="Inserisci eventuali note sulla misurazione"
                  value={currentOperation.formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                />
              </div>

              {/* Risultati calcolati */}
              {currentOperation.formData.animalsPerKg && (
                <Card className="shadow-sm bg-gradient-to-r from-slate-50 to-blue-50 overflow-hidden">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3 text-slate-700">Risultati calcolati</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-white rounded-md shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Animali per kg</p>
                        <p className="font-bold text-lg text-slate-900">
                          {currentOperation.formData.animalsPerKg.toLocaleString('it-IT')}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-md shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Peso medio (mg)</p>
                        <p className="font-bold text-lg text-slate-900">
                          {currentOperation.formData.averageWeight?.toLocaleString('it-IT') || '-'}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-md shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Numero totale animali</p>
                        <p className="font-bold text-lg text-slate-900">
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