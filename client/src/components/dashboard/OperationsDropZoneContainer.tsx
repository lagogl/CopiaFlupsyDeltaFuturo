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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PesoOperationResults } from "@/components/peso/PesoOperationResults";
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
  Tag,
  Info,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { calculateAverageWeight, getOperationTypeLabel } from "@/lib/utils";
import { useDrag, useDrop } from 'react-dnd';

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
  const [previousOperationData, setPreviousOperationData] = useState<{
    animalsPerKg: number;
    averageWeight: number;
    animalCount: number;
    lotId: number | null;
  } | null>(null);

  // Carica dati delle ceste, operazioni, cicli e lotti
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
  
  const { data: lots } = useQuery({
    queryKey: ['/api/lots'],
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
      setPreviousOperationData(null);
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
  const filteredBaskets = baskets && Array.isArray(baskets)
    ? baskets.filter((basket: any) => basket.flupsyId === flupsyId)
    : [];

  // Gestisce il rilascio di un'operazione su una cesta
  const handleOperationDrop = useCallback(
    (basketId: number, operationType: DraggableOperationType) => {
      if (!baskets || !operations) return;
      
      // Trova il ciclo attivo per questa cesta
      const basket = (baskets && Array.isArray(baskets)) ? baskets.find((b: any) => b.id === basketId) : undefined;
      if (!basket || basket.currentCycleId === null) {
        toast({
          title: "Impossibile eseguire l'operazione",
          description: "La cesta non ha un ciclo attivo",
          variant: "destructive",
        });
        return;
      }

      // Trova l'ultima operazione per questa cesta
      const basketOperations = operations && Array.isArray(operations)
        ? operations.filter((op: any) => op.basketId === basketId)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];
      
      const lastOperation = basketOperations.length > 0 ? basketOperations[0] : null;

      // Salva una copia dei dati precedenti che non cambierà
      if (lastOperation?.animalsPerKg && lastOperation?.averageWeight && lastOperation?.animalCount) {
        setPreviousOperationData({
          animalsPerKg: lastOperation.animalsPerKg,
          averageWeight: lastOperation.averageWeight,
          animalCount: lastOperation.animalCount,
          lotId: lastOperation?.lotId || null
        });
      }
      
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
    if (currentOperation.type === 'misura' && (field === 'sampleWeight' || field === 'sampleCount' || field === 'deadCount' || field === 'totalWeight')) {
      const sampleWeight = field === 'sampleWeight' ? parseFloat(value) : parseFloat(currentOperation.formData.sampleWeight || '0');
      const liveSampleCount = field === 'sampleCount' ? parseInt(value) : parseInt(currentOperation.formData.sampleCount || '0');
      const deadCount = field === 'deadCount' ? parseInt(value) : parseInt(currentOperation.formData.deadCount || '0');
      const totalSampleCount = liveSampleCount + deadCount;
      
      // Calcola la percentuale di mortalità nel campione
      if (totalSampleCount > 0) {
        const mortalityRate = deadCount / totalSampleCount;
        updatedFormData.mortalityRate = mortalityRate;
      }
      
      if (!isNaN(sampleWeight) && !isNaN(liveSampleCount) && sampleWeight > 0 && liveSampleCount > 0) {
        // Il peso del campione include sia animali vivi che morti
        // Per calcolare il peso effettivo degli animali vivi, stimiamo il peso medio per animale
        // e moltiplichiamo per il numero di animali vivi
        
        // Se non ci sono animali morti, il peso totale è già il peso degli animali vivi
        let liveWeight = sampleWeight;
        
        // Se ci sono anche animali morti, calcola il peso proporzionale degli animali vivi
        if (totalSampleCount > 0 && totalSampleCount > liveSampleCount) {
          // Peso medio stimato per animale nel campione (sia vivi che morti)
          const averageWeightPerAnimal = sampleWeight / totalSampleCount;
          
          // Peso stimato della parte viva del campione
          liveWeight = liveSampleCount * averageWeightPerAnimal;
        }
        
        // Calcola animali per kg basato SOLO sugli animali vivi
        const animalsPerKg = Math.round((liveSampleCount * 1000) / liveWeight);
        updatedFormData.animalsPerKg = animalsPerKg;
        
        // Calcola peso medio in mg (basato sugli animali vivi)
        updatedFormData.averageWeight = Math.round((liveWeight * 1000) / liveSampleCount);
        
        // Se c'è anche il peso totale, aggiorna il conteggio stimato
        if (updatedFormData.totalWeight) {
          const totalWeightKg = parseFloat(updatedFormData.totalWeight);
          if (!isNaN(totalWeightKg) && totalWeightKg > 0) {
            // Numero di animali vivi stimato in base al peso totale
            const estimatedLiveCount = Math.round(animalsPerKg * totalWeightKg);
            
            // Se abbiamo una percentuale di mortalità, calcoliamo il numero totale di animali
            // considerando la stessa proporzione di morti
            if (updatedFormData.mortalityRate !== undefined && updatedFormData.mortalityRate > 0) {
              // Calcolo corretto del tasso di mortalità dal campione
              const mortalityRate = updatedFormData.mortalityRate;
              
              // Calcolo diretto del numero di animali morti basato sul tasso di mortalità
              // Dato che ora sappiamo che il campione contiene sia animali vivi che morti
              const estimatedDeadCount = Math.round((mortalityRate * estimatedLiveCount) / (1 - mortalityRate));
              
              // Calcolo del totale come somma di vivi + morti
              const estimatedTotalCount = estimatedLiveCount + estimatedDeadCount;
              
              // Salviamo solo gli animali vivi nel database, escludendo i morti
              updatedFormData.animalCount = estimatedLiveCount;
              updatedFormData.estimatedTotalCount = estimatedTotalCount;
              updatedFormData.estimatedDeadCount = estimatedDeadCount;
            } else {
              updatedFormData.animalCount = estimatedLiveCount;
              updatedFormData.estimatedTotalCount = estimatedLiveCount;
              updatedFormData.estimatedDeadCount = 0;
            }
          }
        }
      }
    }
    
    // Calcoli automatici per l'operazione di peso
    if (currentOperation.type === 'peso' && field === 'totalWeight') {
      const totalWeightKg = parseFloat(value);
      
      // Se abbiamo il numero di animali dall'operazione precedente, ricalcoliamo il peso medio
      if (previousOperationData?.animalCount && !isNaN(totalWeightKg) && totalWeightKg > 0) {
        const animalCount = previousOperationData.animalCount;
        
        // Calcola nuovo peso medio in mg (moltiplica kg per 1.000.000 per ottenere mg)
        const newAverageWeight = Math.round((totalWeightKg * 1000000) / animalCount);
        updatedFormData.averageWeight = newAverageWeight;
        
        // Calcola nuovo animali per kg (direttamente, dato che il peso è già in kg)
        const newAnimalsPerKg = Math.round(animalCount / totalWeightKg);
        updatedFormData.animalsPerKg = newAnimalsPerKg;
        
        // Mantieni lo stesso conteggio di animali dell'operazione precedente
        updatedFormData.animalCount = animalCount;
      }
    }
    
    // Aggiorna il peso totale e calcola il numero di animali per altre operazioni
    if (field === 'totalWeight' && updatedFormData.animalsPerKg && currentOperation.type !== 'peso') {
      const totalWeightKg = parseFloat(value);
      if (!isNaN(totalWeightKg) && totalWeightKg > 0) {
        updatedFormData.animalCount = Math.round(updatedFormData.animalsPerKg * totalWeightKg);
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
    
    // Verifica che i campi necessari siano compilati per l'operazione di peso
    if (currentOperation.type === 'peso') {
      const { totalWeight } = currentOperation.formData;
      
      if (!totalWeight) {
        toast({
          title: "Dati incompleti",
          description: "È necessario inserire il peso totale in kg",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Prepara i dati da inviare
    const operationData = {
      date: currentOperation.formData.date,
      basketId: currentOperation.formData.basketId,
      cycleId: currentOperation.formData.cycleId,
      type: currentOperation.formData.type,
      sampleWeight: currentOperation.formData.sampleWeight ? parseFloat(currentOperation.formData.sampleWeight) : null,
      sampleCount: currentOperation.formData.sampleCount ? parseInt(currentOperation.formData.sampleCount) : null,
      totalWeight: currentOperation.formData.totalWeight ? parseFloat(currentOperation.formData.totalWeight) : null,
      deadCount: currentOperation.formData.deadCount ? parseInt(currentOperation.formData.deadCount) : null,
      mortalityRate: currentOperation.formData.mortalityRate ? parseFloat(currentOperation.formData.mortalityRate) : null,
      animalsPerKg: currentOperation.formData.animalsPerKg,
      averageWeight: currentOperation.formData.averageWeight,
      animalCount: currentOperation.formData.animalCount,
      lotId: currentOperation.formData.lotId,
      sizeId: currentOperation.formData.sizeId,
      notes: currentOperation.formData.notes || ""
    };
    
    createOperationMutation.mutate(operationData);
  };

  // Gestisce la conferma dell'operazione di cessazione
  const handleTerminationConfirm = () => {
    handleFormSubmit();
    setConfirmDialogOpen(false);
  };

  // Definisce le operazioni disponibili
  const operationItems: { type: DraggableOperationType; icon: React.ReactNode; label: string }[] = [
    { type: "misura", icon: <Ruler size={24} />, label: "Misurazione" },
    { type: "peso", icon: <Scale size={24} />, label: "Pesatura" },
    { type: "selezione", icon: <Scissors size={24} />, label: "Selezione" },
    { type: "vendita", icon: <ShoppingBag size={24} />, label: "Vendita" },
    { type: "selezione-vendita", icon: <Tag size={24} />, label: "Selezione Vendita" },
    { type: "pulizia", icon: <Brush size={24} />, label: "Pulizia" },
    { type: "trattamento", icon: <Droplets size={24} />, label: "Trattamento" },
    { type: "cessazione", icon: <Trash2 size={24} />, label: "Cessazione" }
  ];

  return (
    <div className="h-full flex flex-col">
      <DndProvider backend={HTML5Backend}>
        <div className="mb-4 bg-gradient-to-b from-white to-slate-50 p-4 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-3 text-slate-800">Operazioni disponibili</h2>
          <p className="text-sm text-slate-600 mb-4">
            Seleziona un'operazione e trascinala sulla cesta desiderata per registrarla
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
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
        
        <div className="flex-1 overflow-auto">
          <h2 className="text-lg font-semibold mb-3 text-slate-800">Ceste nel FLUPSY</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </DndProvider>
      
      {/* Dialog per l'inserimento di dati */}
      <Dialog open={operationDialogOpen} onOpenChange={setOperationDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentOperation?.type === 'misura' && <Ruler size={20} className="text-blue-500" />}
              {currentOperation?.type === 'peso' && <Scale size={20} className="text-green-500" />}
              {currentOperation?.type === 'selezione' && <Scissors size={20} className="text-yellow-500" />}
              {currentOperation?.type === 'vendita' && <ShoppingBag size={20} className="text-red-500" />}
              {currentOperation?.type === 'selezione-vendita' && <Tag size={20} className="text-indigo-500" />}
              {currentOperation?.type === 'pulizia' && <Brush size={20} className="text-cyan-500" />}
              {currentOperation?.type === 'trattamento' && <Droplets size={20} className="text-teal-500" />}
              {currentOperation?.type === 'cessazione' && <Trash2 size={20} className="text-gray-500" />}
              {getOperationTypeLabel(currentOperation?.type || 'misura')}
              {currentOperation && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  (Cesta #{baskets?.find((b: any) => b.id === currentOperation.basketId)?.physicalNumber})
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati relativi all'operazione selezionata
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Data</Label>
                <Input
                  id="date"
                  type="date"
                  value={currentOperation?.formData.date || ''}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                />
              </div>
              
              {/* Se ci sono operazioni precedenti, mostriamo i dati precedenti */}
              {previousOperationData && (previousOperationData.animalsPerKg || previousOperationData.averageWeight) && (
                <div className="col-span-2">
                  <Card className="bg-gray-50">
                    <CardContent className="p-3">
                      <h4 className="text-sm font-medium mb-2 text-slate-700">Dati precedenti</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {previousOperationData.animalsPerKg && (
                          <div className="p-2 bg-white rounded shadow-sm">
                            <p className="text-xs text-gray-500">Animali per kg</p>
                            <p className="font-medium text-slate-900">
                              {previousOperationData.animalsPerKg.toLocaleString('it-IT')}
                            </p>
                          </div>
                        )}
                        
                        {previousOperationData.averageWeight && (
                          <div className="p-2 bg-white rounded shadow-sm">
                            <p className="text-xs text-gray-500">Peso medio (mg)</p>
                            <p className="font-medium text-slate-900">
                              {previousOperationData.averageWeight.toLocaleString('it-IT')}
                            </p>
                          </div>
                        )}
                        
                        {previousOperationData.animalCount && (
                          <div className="p-2 bg-white rounded shadow-sm">
                            <p className="text-xs text-gray-500">Numero animali</p>
                            <p className="font-medium text-slate-900">
                              {previousOperationData.animalCount.toLocaleString('it-IT')}
                            </p>
                          </div>
                        )}
                        
                        {previousOperationData.animalCount && previousOperationData.averageWeight && (
                          <div className="p-2 bg-white rounded shadow-sm">
                            <p className="text-xs text-gray-500">Peso totale (kg)</p>
                            <p className="font-medium text-slate-900">
                              {((previousOperationData.animalCount * previousOperationData.averageWeight) / 1000000).toLocaleString('it-IT', {maximumFractionDigits: 3})}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {/* Form fields specifici per l'operazione di pesatura */}
              {currentOperation?.type === 'peso' && (
                <div className="col-span-2">
                  <Label htmlFor="totalWeight">Peso totale (kg)</Label>
                  <Input
                    id="totalWeight"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Inserisci il peso totale in chilogrammi"
                    value={currentOperation.formData.totalWeight || ''}
                    onChange={(e) => handleFormChange('totalWeight', e.target.value)}
                  />
                </div>
              )}
              
              {/* Form fields specifici per l'operazione di misurazione */}
              {currentOperation?.type === 'misura' && (
                <>
                  <div>
                    <Label htmlFor="sampleWeight">Peso del campione (g)</Label>
                    <Input
                      id="sampleWeight"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Peso del campione in grammi"
                      value={currentOperation.formData.sampleWeight || ''}
                      onChange={(e) => handleFormChange('sampleWeight', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sampleCount">Numero animali vivi nel campione</Label>
                    <Input
                      id="sampleCount"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Numero di animali vivi nel campione"
                      value={currentOperation.formData.sampleCount || ''}
                      onChange={(e) => handleFormChange('sampleCount', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deadCount">Numero animali morti nel campione</Label>
                    <Input
                      id="deadCount"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="Numero di animali morti nel campione"
                      value={currentOperation.formData.deadCount || ''}
                      onChange={(e) => handleFormChange('deadCount', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="totalWeight">Peso totale (kg)</Label>
                    <Input
                      id="totalWeight"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Inserisci il peso totale in chilogrammi"
                      value={currentOperation.formData.totalWeight || ''}
                      onChange={(e) => handleFormChange('totalWeight', e.target.value)}
                    />
                  </div>
                </>
              )}
              
              {/* Campi comuni per tutte le operazioni */}
              <div className="col-span-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  placeholder="Inserisci eventuali note sull'operazione"
                  value={currentOperation?.formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                />
              </div>

              {/* Risultati calcolati */}
              {currentOperation?.type === 'peso' && currentOperation.formData.animalsPerKg ? (
                <PesoOperationResults
                  currentOperation={currentOperation}
                  previousOperationData={previousOperationData}
                />
              ) : (
                currentOperation?.formData.animalsPerKg && (
                  <Card className="shadow-sm bg-gradient-to-r from-slate-50 to-blue-50 overflow-hidden col-span-2">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-3 text-slate-700">Risultati calcolati</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                        {currentOperation.formData.mortalityRate !== undefined && (
                          <div className="p-3 bg-white rounded-md shadow-sm">
                            <p className="text-xs text-gray-500 mb-1">Tasso di mortalità</p>
                            <p className="font-bold text-lg text-slate-900">
                              {(currentOperation.formData.mortalityRate * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                        <div className="p-3 bg-white rounded-md shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Animali vivi</p>
                          <p className="font-bold text-lg text-slate-900">
                            {currentOperation.formData.animalCount?.toLocaleString('it-IT') || '-'}
                          </p>
                          {currentOperation.formData.estimatedTotalCount !== undefined && currentOperation.formData.estimatedDeadCount > 0 && (
                            <div className="mt-1 text-xs">
                              <span className="text-blue-600">
                                Totali: {Math.round(currentOperation.formData.estimatedTotalCount || 0).toLocaleString('it-IT')}
                              </span>
                              <span className="mx-1">|</span>
                              <span className="text-red-500">
                                Morti: {Math.round(currentOperation.formData.estimatedDeadCount || 0).toLocaleString('it-IT')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOperationDialogOpen(false)}
            >
              Annulla
            </Button>
            
            {currentOperation?.type === 'cessazione' ? (
              <Button 
                onClick={() => setConfirmDialogOpen(true)}
                variant="destructive"
              >
                Conferma cessazione
              </Button>
            ) : (
              <Button 
                onClick={handleFormSubmit}
                disabled={createOperationMutation.isPending}
              >
                {createOperationMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Salvataggio...
                  </span>
                ) : (
                  'Salva operazione'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog di conferma per la cessazione */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma cessazione del ciclo</AlertDialogTitle>
            <AlertDialogDescription>
              Questa operazione terminerà il ciclo attivo per la cesta selezionata. 
              L'operazione non può essere annullata. Vuoi continuare?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminationConfirm} className="bg-red-600 hover:bg-red-700">
              Conferma cessazione
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}