import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Zap, Filter, BarChart, Layers, AlertCircle, Calculator, Scale as ScaleIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatNumberWithCommas, getOperationTypeLabel, getOperationTypeColor, getBasketColorBySize, getSizeFromAnimalsPerKg } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { type SampleCalculatorResult } from '@/components/SampleCalculator';
import IntegratedSampleCalculator from '@/components/IntegratedSampleCalculator';
import MisurazioneDirectForm from '@/components/MisurazioneDirectForm';

// Tipi che useremo 
interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
}

interface Flupsy {
  id: number;
  name: string;
  location: string;
}

interface Operation {
  id: number;
  basketId: number;
  cycleId: number;
  date: string;
  type: string;
  animalsPerKg: number | null;
  averageWeight: number | null;
  sizeId: number | null;
  lotId: number | null;
  deadCount: number | null;  // Numero di animali morti
  mortalityRate: number | null;  // Percentuale di mortalità
  notes: string | null;
}

// Interfaccia estesa per l'operazione corrente durante l'editing
interface CurrentOperationData {
  type: string;
  date: string;
  basketId: number;
  cycleId: number;
  sizeId?: number | null;
  lotId?: number | null;
  sgrId?: number | null;
  animalsPerKg?: number | null;
  averageWeight?: number | null;
  deadCount?: number | null;
  mortalityRate?: number | null;
  animalCount?: number | null;
  batchWeight?: number | null;
  totalWeight?: number | null; // Peso totale in grammi
  notes?: string | null;
  sampleWeight?: number | null; // Peso del campione in grammi
  sampleCount?: number | null; // Numero di animali contati nel campione
  updateForm?: () => void; // Funzione di callback per aggiornare il form
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: 'active' | 'closed';
}

interface Lot {
  id: number;
  arrivalDate: string;
  supplier: string;
  quality: string | null;
  state: string;
}

interface BasketCardProps {
  basket: Basket;
  flupsy?: Flupsy;
  lastOperation?: Operation;
  cycle?: Cycle;
  lot?: Lot; 
  selected: boolean;
  onSelect: (basketId: number) => void;
  onQuickOperation: (basketId: number, operationType: string) => void;
  onDeleteOperation?: (operationId: number) => void;
}

// Componente card per singola cesta
function BasketCard({ 
  basket, 
  flupsy, 
  lastOperation, 
  cycle, 
  lot,
  selected,
  onSelect,
  onQuickOperation,
  onDeleteOperation
}: BasketCardProps) {
  const positionText = basket.row && basket.position 
    ? `${basket.row} - Pos. ${basket.position}` 
    : 'Posizione non definita';
    
  const daysActive = cycle 
    ? Math.floor((new Date().getTime() - new Date(cycle.startDate).getTime()) / (1000 * 3600 * 24))
    : 0;
    
  let sizeIndicator = '';
  let colorClass = 'bg-gray-200';
  
  if (lastOperation?.averageWeight) {
    // Indicatore dimensione basato sul peso medio
    const avgWeightMg = lastOperation.averageWeight;
    if (avgWeightMg < 50) sizeIndicator = 'T0';
    else if (avgWeightMg < 100) sizeIndicator = 'T1';
    else if (avgWeightMg < 200) sizeIndicator = 'T2';
    else if (avgWeightMg < 300) sizeIndicator = 'T3';
    else if (avgWeightMg < 500) sizeIndicator = 'T4';
    else if (avgWeightMg < 800) sizeIndicator = 'T5';
    else if (avgWeightMg < 1000) sizeIndicator = 'T6';
    else sizeIndicator = 'T7';
    
    colorClass = getBasketColorBySize(sizeIndicator);
  }
  
  // Calcola i giorni dall'ultima operazione
  const daysSinceLastOp = lastOperation 
    ? Math.floor((new Date().getTime() - new Date(lastOperation.date).getTime()) / (1000 * 3600 * 24))
    : null;
  
  return (
    <Card className={`relative overflow-hidden transition-all ${selected ? 'ring-2 ring-primary' : ''}`}>
      <div className={`absolute top-0 left-0 w-2 h-full ${colorClass}`} />
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Checkbox 
            checked={selected}
            onCheckedChange={() => onSelect(basket.id)}
            className="data-[state=checked]:bg-primary"
          />
          <Badge 
            variant={daysSinceLastOp && daysSinceLastOp > 7 ? "destructive" : "secondary"}
            className="text-xs font-normal"
          >
            {daysSinceLastOp === null ? 'Nessuna operazione' : `${daysSinceLastOp} giorni fa`}
          </Badge>
        </div>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Cesta #{basket.physicalNumber}</span>
          {sizeIndicator && (
            <Badge className={`${colorClass} hover:${colorClass}`}>{sizeIndicator}</Badge>
          )}
        </CardTitle>
        <CardDescription>
          {flupsy ? flupsy.name : `FLUPSY #${basket.flupsyId}`}
        </CardDescription>
        <div className="text-xs mt-1 px-6 -mt-1 text-muted-foreground">{positionText}</div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="text-sm space-y-1">
          {cycle && (
            <div>
              <span className="font-medium">Ciclo attivo da:</span> {daysActive} giorni
            </div>
          )}
          {lastOperation && (
            <>
              <div className="flex justify-between items-center">
                <span className="font-medium">Ultima operazione:</span>{' '}
                <div className="flex items-center">
                  <Badge variant="secondary" className="text-foreground font-medium">
                    {getOperationTypeLabel(lastOperation.type)}
                  </Badge>
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 ml-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteOperation) {
                          onDeleteOperation(lastOperation.id);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </Button>
                </div>
              </div>
              <div>
                <span className="font-medium">Data:</span>{' '}
                {format(new Date(lastOperation.date), 'dd/MM/yyyy', { locale: it })}
              </div>
              {lastOperation.animalsPerKg && (
                <div>
                  <span className="font-medium">Animali/kg:</span>{' '}
                  {formatNumberWithCommas(lastOperation.animalsPerKg)}
                </div>
              )}
              {lastOperation.deadCount && lastOperation.deadCount > 0 && (
                <div className="flex items-center">
                  <span className="font-medium">Mortalità:</span>{' '}
                  <span className="ml-1">
                    {lastOperation.mortalityRate ? `${lastOperation.mortalityRate}%` : ''}
                    {lastOperation.deadCount ? ` (${lastOperation.deadCount} morti)` : ''}
                  </span>
                  {lastOperation.mortalityRate && lastOperation.mortalityRate > 5 && (
                    <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">Alta</Badge>
                  )}
                </div>
              )}
              {lot && (
                <div>
                  <span className="font-medium">Lotto:</span>{' '}
                  {lot.supplier} - {format(new Date(lot.arrivalDate), 'dd/MM/yyyy', { locale: it })}
                </div>
              )}
            </>
          )}
          {!lastOperation && (
            <div className="italic text-muted-foreground">
              Nessuna operazione registrata
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex flex-wrap gap-1">
        <Button 
          size="sm" 
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={() => onQuickOperation(basket.id, 'misura')}
        >
          Misura
        </Button>
        <Button 
          size="sm" 
          variant="outline"
          className="flex-1 h-8 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
          onClick={() => onQuickOperation(basket.id, 'peso')}
        >
          Peso
        </Button>
        <Button 
          size="sm" 
          variant="secondary"
          className="flex-1 h-8 text-xs font-semibold"
          onClick={() => onQuickOperation(basket.id, 'duplicate')}
        >
          <Zap className="h-3 w-3 mr-1" />
          Ripeti
        </Button>
      </CardFooter>
    </Card>
  );
}

// Componente principale
export default function QuickOperations() {
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<string>('all');
  const [selectedBaskets, setSelectedBaskets] = useState<number[]>([]);
  const [operationDialogOpen, setOperationDialogOpen] = useState(false);
  const [selectedOperationType, setSelectedOperationType] = useState<string | null>(null);
  const [selectedBasketId, setSelectedBasketId] = useState<number | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filterDays, setFilterDays] = useState<string>('all');
  // Inizializziamo con la data di oggi
  const today = new Date();
  
  // Funzione personalizzata per aggiornare i dati dell'operazione in modo tracciabile
  const [currentOperationData, setCurrentOperationDataInternal] = useState<CurrentOperationData | null>(null);
  
  // Wrapper per il setter originale che aggiunge logging
  const setCurrentOperationData = (data: CurrentOperationData) => {
    console.log("setCurrentOperationData chiamata con:", data);
    setCurrentOperationDataInternal(data);
  };
  
  // Stati per il calcolatore integrato
  const [sampleWeight, setSampleWeight] = useState<number | null>(null);
  const [sampleCount, setSampleCount] = useState<number | null>(null);
  const [samplePercentage, setSamplePercentage] = useState<number>(100);

  
  const { toast } = useToast();
  
  // Fetch dati
  const { data: baskets, isLoading: basketsLoading } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  const { data: flupsys, isLoading: flupsysLoading } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: operations, isLoading: operationsLoading } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['/api/cycles'],
  });
  
  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['/api/lots'],
  });
  
  const { data: sizes, isLoading: sizesLoading } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Filtriamo solo le ceste con cicli attivi
  const activeCycles = cycles ? cycles.filter((c: Cycle) => c.state === 'active') : [];
  const basketsWithActiveCycles = baskets ? baskets.filter((b: Basket) => b.currentCycleId !== null) : [];
  
  // Gestisce basket filtrati in base ai criteri selezionati
  const filteredBaskets = basketsWithActiveCycles.filter((basket: Basket) => {
    // Filtra per FLUPSY
    if (selectedFlupsyId !== 'all' && basket.flupsyId !== parseInt(selectedFlupsyId)) {
      return false;
    }
    
    // Filtra per giorni dall'ultima operazione
    if (filterDays !== 'all') {
      const basketOperations = operations ? operations.filter((op: Operation) => op.basketId === basket.id) : [];
      if (basketOperations.length === 0) return true; // Nessuna operazione conta come "vecchia"
      
      const sortedOps = [...basketOperations].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      const lastOpDate = new Date(sortedOps[0].date);
      const daysSince = Math.floor((new Date().getTime() - lastOpDate.getTime()) / (1000 * 3600 * 24));
      
      if (filterDays === '3+' && daysSince < 3) return false;
      if (filterDays === '7+' && daysSince < 7) return false;
      if (filterDays === '14+' && daysSince < 14) return false;
    }
    
    return true;
  });
  
  // Gestisce selezione di una cesta
  const handleSelectBasket = (basketId: number) => {
    if (selectedBaskets.includes(basketId)) {
      setSelectedBaskets(selectedBaskets.filter(id => id !== basketId));
    } else {
      setSelectedBaskets([...selectedBaskets, basketId]);
    }
  };
  
  // Funzione ausiliaria per preparare i dati dell'operazione peso
  const preparePesoOperationData = (data: any): any => {
    if (data.type !== 'peso') return data;
    
    // Controlliamo se abbiamo già i dati calcolati
    if (data.totalWeight && data.animalsPerKg && data.averageWeight) {
      return data;
    }
    
    // Leggiamo il peso direttamente dal campo input
    const input = document.getElementById('peso-totale-kg') as HTMLInputElement;
    if (!input || !input.value) return data;
    
    const totalWeightKg = parseFloat(input.value);
    if (isNaN(totalWeightKg) || totalWeightKg <= 0) return data;
    
    // Convertiamo in grammi per il database
    const totalWeightGrams = totalWeightKg * 1000;
    
    // Se non abbiamo animalsPerKg ma abbiamo animalCount, calcoliamolo
    let animalsPerKg = data.animalsPerKg;
    let averageWeight = data.averageWeight;
    
    if (!animalsPerKg && data.animalCount) {
      animalsPerKg = Math.round(data.animalCount / totalWeightKg);
      averageWeight = 1000000 / animalsPerKg;
    }
    
    // Verifichiamo che la data nel payload sia effettivamente quella selezionata dall'utente
    // e non la data corrente (per evitare sostituzioni indesiderate)
    const selectedDate = data.date instanceof Date ? data.date : new Date(data.date);
    
    // Creiamo una copia arricchita dei dati
    return {
      ...data,
      totalWeight: totalWeightGrams,
      animalsPerKg,
      averageWeight,
      date: selectedDate // Assicuriamoci che sia la data selezionata dall'utente
    };
  };
  
  // Mutazione per creare una nuova operazione
  const createOperationMutation = useMutation({
    mutationFn: (operationData: any) => {
      // Utilizziamo la funzione ausiliaria per assicurarci che i dati siano completi
      const preparedData = preparePesoOperationData(operationData);
      console.log("Dati operazione inviati al server:", preparedData);
      return apiRequest('POST', '/api/operations', preparedData);
    },
    onSuccess: () => {
      // Invalida la cache delle operazioni per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      // Mostra toast di successo
      toast({
        title: 'Operazione registrata',
        description: 'L\'operazione è stata registrata con successo',
      });
      
      // Chiudi il modal
      setOperationDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: `Errore durante la registrazione: ${error.message || 'Errore sconosciuto'}`,
        variant: 'destructive'
      });
    }
  });

  // Stato per il form di misurazione diretta
  const [showMisurazioneForm, setShowMisurazioneForm] = useState(false);
  
  // Gestisce click su operazione rapida
  const handleQuickOperation = (basketId: number, operationType: string) => {
    // Se l'operazione è "duplicate", dobbiamo ottenere l'ultima operazione
    // e prepararla per la ripetizione
    const basket = baskets?.find((b: Basket) => b.id === basketId);
    if (!basket) return;
    
    const basketOperations = operations ? operations.filter((op: Operation) => op.basketId === basketId) : [];
    const sortedOps = [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const lastOperation = sortedOps.length > 0 ? sortedOps[0] : null;
    
    // Se è un'operazione di misurazione, usiamo il form diretto
    if (operationType === 'misura') {
      setSelectedBasketId(basketId);
      setShowMisurazioneForm(true);
      // Non apriamo il dialogo classico
      return;
    }
    
    // Per altre operazioni, seguiamo il flusso normale
    setSelectedBasketId(basketId);
    setSelectedOperationType(operationType);
    setOperationDialogOpen(true);
  };
  
  // Mutazione per cancellare un'operazione
  const deleteOperationMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/operations/${id}`);
    },
    onSuccess: () => {
      // Invalida la cache delle operazioni per ricaricare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      
      // Mostra toast di successo
      toast({
        title: 'Operazione eliminata',
        description: 'L\'operazione è stata eliminata con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: `Errore durante l'eliminazione: ${error.message || 'Errore sconosciuto'}`,
        variant: 'destructive'
      });
    }
  });

  // Gestisce la cancellazione di un'operazione
  const handleDeleteOperation = (operationId: number) => {
    // Mostra un toast informativo
    toast({
      title: 'Eliminazione in corso...',
      description: 'Eliminazione dell\'operazione in corso'
    });
    
    // Esegui la mutazione
    deleteOperationMutation.mutate(operationId);
  };
  
  // Gestisce operazione su multiple ceste
  const handleBulkOperation = (operationType: string) => {
    if (selectedBaskets.length === 0) {
      toast({
        title: 'Nessuna cesta selezionata',
        description: 'Seleziona almeno una cesta per eseguire un\'operazione di gruppo',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Operazione di gruppo attivata',
      description: `${selectedBaskets.length} ceste selezionate - Operazione: ${operationType}`,
    });
  };
  
  // Recupera i dati associati a una cesta
  const getBasketData = (basketId: number) => {
    const basket = baskets?.find((b: Basket) => b.id === basketId);
    if (!basket) return { basket: null };
    
    const flupsy = flupsys?.find((f: Flupsy) => f.id === basket.flupsyId);
    
    const basketOperations = operations ? operations.filter((op: Operation) => op.basketId === basketId) : [];
    const sortedOps = [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastOperation = sortedOps.length > 0 ? sortedOps[0] : undefined;
    
    const cycle = cycles?.find((c: Cycle) => c.id === basket.currentCycleId);
    
    const lot = lastOperation?.lotId ? lots?.find((l: Lot) => l.id === lastOperation.lotId) : undefined;
    
    return { basket, flupsy, lastOperation, cycle, lot };
  };
  
  const isLoading = basketsLoading || flupsysLoading || operationsLoading || cyclesLoading || lotsLoading || sizesLoading;
  
  // Funzione per calcolare risultati in base ai dati di input del campione
  const calculateSampleResults = (weight: number | null, count: number | null, percentage: number = 100, deadCount: number | null = null) => {
    if (weight && count && weight > 0 && count > 0) {
      // Calcolo del numero di animali per kg
      const animalsPerKg = Math.round((count / weight) * 1000);
      
      // Calcolo del peso medio in mg
      const averageWeight = animalsPerKg > 0 ? 1000000 / animalsPerKg : 0;
      
      // Calcolo della popolazione totale stimata
      const totalPopulation = Math.round(count / (percentage / 100));
      
      // Risultati da restituire
      const results = {
        animalsPerKg,
        averageWeight,
        totalPopulation,
        deadCount: null as number | null,
        mortalityRate: null as number | null
      };
      
      // Calcoliamo la mortalità se esiste un valore di morti
      if (deadCount !== null && deadCount >= 0 && totalPopulation > 0) {
        // Se il deadCount è relativo al campione, calcoliamo il valore totale
        const totalDeadCount = percentage < 100 
          ? Math.round(deadCount / (percentage / 100)) 
          : deadCount;
          
        // Calcoliamo la percentuale di mortalità
        const calculatedMortalityRate = (totalDeadCount / (totalPopulation + totalDeadCount)) * 100;
        results.deadCount = totalDeadCount;
        results.mortalityRate = Math.round(calculatedMortalityRate * 10) / 10; // Arrotondiamo a una cifra decimale
      }
      
      return results;
    }
    
    return null;
  };
  
  return (
    <div>
      {/* Form di misurazione diretta */}
      {showMisurazioneForm && selectedBasketId && (
        <div className="mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nuova Misurazione</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMisurazioneForm(false)}
              >
                Chiudi
              </Button>
            </div>
            
            {(() => {
              const basket = baskets?.find((b: Basket) => b.id === selectedBasketId);
              const cycle = cycles?.find((c: Cycle) => c.id === basket?.currentCycleId);
              if (!basket || !cycle) return <div>Errore: cesta o ciclo non trovati</div>;
              
              // Recuperiamo l'ultima operazione per precompilare alcuni campi
              const basketOperations = operations 
                ? operations.filter((op: Operation) => op.basketId === selectedBasketId) 
                : [];
              const sortedOps = [...basketOperations].sort((a, b) => 
                new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              const lastOperation = sortedOps.length > 0 ? sortedOps[0] : null;
              
              // Recuperiamo i dati del lotto se presente
              let lottoDati = null;
              if (lastOperation?.lotId) {
                const lotto = lots?.find((l: any) => l.id === lastOperation.lotId);
                if (lotto) {
                  lottoDati = `${lotto.id} - ${lotto.supplier}`;
                }
              }
              
              return (
                <MisurazioneDirectForm 
                  basketId={selectedBasketId}
                  cycleId={cycle.id}
                  sizeId={lastOperation?.sizeId || null}
                  lotId={lastOperation?.lotId || null}
                  lottoInfo={lottoDati}
                  basketNumber={basket?.physicalNumber || 0}
                  defaultAnimalsPerKg={lastOperation?.animalsPerKg || null}
                  defaultAverageWeight={lastOperation?.averageWeight || null}
                  defaultAnimalCount={lastOperation?.animalCount || null}
                  onSuccess={() => {
                    setShowMisurazioneForm(false);
                    // Invalida la cache delle operazioni per ricaricare i dati
                    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
                    // Mostra toast di successo
                    toast({
                      title: 'Misurazione completata',
                      description: 'La misurazione è stata registrata con successo'
                    });
                  }}
                  onCancel={() => setShowMisurazioneForm(false)}
                />
              );
            })()}
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Operazioni Rapide</h2>
        
        <div className="flex space-x-2">
          <Select value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Griglia</SelectItem>
              <SelectItem value="list">Lista</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" disabled={selectedBaskets.length === 0}>
            {selectedBaskets.length} selezionate
          </Button>
        </div>
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Filtra per FLUPSY</label>
          <Select value={selectedFlupsyId} onValueChange={setSelectedFlupsyId}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte le unità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le unità</SelectItem>
              {flupsys?.map((flupsy: Flupsy) => (
                <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                  {flupsy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Operazioni datate</label>
          <Select value={filterDays} onValueChange={setFilterDays}>
            <SelectTrigger>
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="3+">Ultime 3+ giorni fa</SelectItem>
              <SelectItem value="7+">Ultime 7+ giorni fa</SelectItem>
              <SelectItem value="14+">Ultime 14+ giorni fa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="actions">Azioni</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>
            <TabsContent value="actions" className="pt-2 space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                disabled={selectedBaskets.length === 0}
                onClick={() => handleBulkOperation('misura')}
              >
                Misura
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                disabled={selectedBaskets.length === 0}
                onClick={() => handleBulkOperation('peso')}
              >
                Peso
              </Button>
              <Button 
                size="sm" 
                variant="default"
                disabled={selectedBaskets.length === 0}
                onClick={() => handleBulkOperation('duplicate')}
              >
                <Zap className="h-4 w-4 mr-1" />
                Ripeti
              </Button>
            </TabsContent>
            <TabsContent value="info" className="pt-2">
              <div className="text-sm">
                <div><strong>Ceste attive:</strong> {basketsWithActiveCycles.length}</div>
                <div><strong>Filtrate:</strong> {filteredBaskets.length}</div>
                <div><strong>Selezionate:</strong> {selectedBaskets.length}</div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : filteredBaskets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nessuna cesta trovata</h3>
          <p className="text-muted-foreground mb-4">
            Non ci sono ceste che corrispondono ai filtri selezionati.
          </p>
          <Button onClick={() => {
            setSelectedFlupsyId('all');
            setFilterDays('all');
          }}>
            Reimposta filtri
          </Button>
        </div>
      ) : (
        <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {filteredBaskets.map((basket: Basket) => {
            const { flupsy, lastOperation, cycle, lot } = getBasketData(basket.id);
            return (
              <BasketCard
                key={basket.id}
                basket={basket}
                flupsy={flupsy}
                lastOperation={lastOperation}
                cycle={cycle}
                lot={lot}
                selected={selectedBaskets.includes(basket.id)}
                onSelect={handleSelectBasket}
                onQuickOperation={handleQuickOperation}
                onDeleteOperation={handleDeleteOperation}
              />
            );
          })}
        </div>
      )}
      
      {/* Dialog per operazioni rapide */}
      <Dialog open={operationDialogOpen} onOpenChange={setOperationDialogOpen}>
        <DialogContent className="max-w-md md:min-w-[500px] dialog-content">
          <DialogHeader>
            <DialogTitle>
              {selectedOperationType === 'duplicate' 
                ? 'Ripeti Ultima Operazione' 
                : `Nuova operazione: ${getOperationTypeLabel(selectedOperationType || '')}`}
            </DialogTitle>
            <DialogDescription>
              Inserisci i dati per registrare l'operazione
            </DialogDescription>
          </DialogHeader>
          
          {selectedBasketId && (
            <div className="py-4 space-y-4">
              {(() => {
                // Recuperiamo i dati necessari
                const basket = baskets?.find((b: Basket) => b.id === selectedBasketId);
                const basketOperations = operations ? operations.filter((op: Operation) => op.basketId === selectedBasketId) : [];
                const sortedOps = [...basketOperations].sort((a, b) => 
                  new Date(b.date).getTime() - new Date(a.date).getTime()
                );
                const lastOperation = sortedOps.length > 0 ? sortedOps[0] : null;
                const cycle = cycles?.find((c: Cycle) => c.id === basket?.currentCycleId);
                
                if (!basket || !cycle) {
                  return <div>Errore nel caricamento dei dati della cesta</div>;
                }
                
                // Se è duplicazione, mostriamo i dati dell'ultima operazione
                if (selectedOperationType === 'duplicate' && lastOperation) {
                  // Verifichiamo se esiste già un'operazione per oggi per questa cesta
                  const today = new Date();
                  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
                  
                  // Cerca operazioni di oggi per questa cesta
                  const hasOperationToday = basketOperations.some(op => {
                    const opDate = new Date(op.date).toISOString().split('T')[0];
                    return opDate === todayString;
                  });
                  
                  // Se esiste già un'operazione oggi, mostra un avviso
                  if (hasOperationToday) {
                    return (
                      <div>
                        <div className="bg-amber-50 border border-amber-200 rounded p-4 mb-4">
                          <AlertCircle className="h-5 w-5 text-amber-500 inline mr-2" />
                          <span className="text-amber-800">
                            Attenzione: è già presente un'operazione registrata oggi per questa cesta.
                            Non è possibile registrare più di un'operazione al giorno per la stessa cesta.
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <Button variant="outline" onClick={() => setOperationDialogOpen(false)}>
                            Chiudi
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  
                  // Prepariamo i dati per la nuova operazione
                  const operationData: CurrentOperationData = {
                    type: lastOperation.type === 'prima-attivazione' ? 'misura' : lastOperation.type,
                    date: today.toISOString(),
                    basketId: selectedBasketId,
                    cycleId: cycle.id,
                    sizeId: lastOperation.sizeId,
                    lotId: lastOperation.lotId,
                    sgrId: lastOperation.sgrId,
                    animalsPerKg: lastOperation.animalsPerKg,
                    deadCount: lastOperation.deadCount || null,
                    mortalityRate: lastOperation.mortalityRate || null,
                    notes: '',
                    // Calcoliamo i valori derivati
                    averageWeight: lastOperation.animalsPerKg 
                      ? 1000000 / lastOperation.animalsPerKg 
                      : null
                  };
                  
                  return (
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Cesta</label>
                          <div className="p-2 rounded bg-gray-100">#{basket.physicalNumber}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Tipo operazione</label>
                          <div className="p-2 rounded bg-gray-100">
                            {getOperationTypeLabel(operationData.type)}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Data</label>
                          <Input 
                            type="date" 
                            defaultValue={format(today, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              operationData.date = new Date(e.target.value).toISOString();
                            }}
                            className="h-9"
                          />
                          <div className="flex items-center mt-1 text-xs text-amber-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Modifica la data se hai già registrato un'operazione oggi
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Animali/kg</label>
                          <Input 
                              type="number" 
                              placeholder="Animali/kg"
                              value={operationData.animalsPerKg?.toString() || ''}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                operationData.animalsPerKg = isNaN(value) ? null : value;
                                // Aggiorna anche il peso medio se necessario
                                if (!isNaN(value) && value > 0) {
                                  operationData.averageWeight = 1000000 / value;
                                } else {
                                  operationData.averageWeight = null;
                                }
                              }}
                              className="h-9 w-full"
                            />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Peso medio (mg)</label>
                          <div className="p-2 rounded bg-gray-100">
                            {operationData.averageWeight ? formatNumberWithCommas(operationData.averageWeight) : "N/D"}
                          </div>
                        </div>
                        
                        {/* Sezione mortalità */}
                        <div>
                          <label className="block text-sm font-medium mb-1">Mortalità (opzionale)</label>
                          <div className="flex space-x-2">
                            <Input 
                              type="number" 
                              placeholder="N. animali morti"
                              value={operationData.deadCount?.toString() || ''}
                              onChange={e => {
                                const value = parseInt(e.target.value);
                                operationData.deadCount = isNaN(value) ? null : value;
                                // Se non abbiamo dati sufficienti per calcolare la mortalità, impostiamo a null
                                operationData.mortalityRate = null;
                              }}
                              className="h-9 flex-1"
                            />
                            {operationData.mortalityRate !== null && (
                              <div className="p-2 rounded bg-gray-100 flex-shrink-0 min-w-20 text-center">
                                {formatNumberWithCommas(operationData.mortalityRate)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-6">
                        {/* Pulsante elimina per l'ultima operazione */}
                        {lastOperation && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              handleDeleteOperation(lastOperation.id);
                              setOperationDialogOpen(false);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                            Elimina Ultima Operazione
                          </Button>
                        )}
                        
                        <div className="flex ml-auto space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setOperationDialogOpen(false)}
                          >
                            Annulla
                          </Button>
                          <Button 
                            onClick={() => {
                              const selectedDate = new Date(operationData.date);
                              const selectedDateString = selectedDate.toISOString().split("T")[0];
                              const hasOperationOnSameDate = basketOperations.some(op => {
                                const opDate = new Date(op.date).toISOString().split("T")[0];
                                return opDate === selectedDateString && op.type === operationData.type;
                              });
                              if (hasOperationOnSameDate) {
                                toast({
                                  title: "Attenzione",
                                  description: `È già presente un'operazione di tipo ${getOperationTypeLabel(operationData.type)} per questa cesta alla data ${format(selectedDate, 'dd/MM/yyyy')}. Modifica la data prima di salvare.`,
                                  variant: "destructive"
                                });
                                return;
                              }
                              createOperationMutation.mutate(operationData);
                            }}
                            disabled={createOperationMutation.isPending}
                          >
                            {createOperationMutation.isPending ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Salvataggio...
                              </>
                            ) : "Salva Operazione"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                } else if (selectedOperationType === 'misura' || selectedOperationType === 'peso') {
                  // Per operazioni di peso o misura semplici
                  const today = new Date();
                  
                  // Ordinare le operazioni per data (più recenti prima)
                  const sortedOps = [...basketOperations].sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                  const lastOperation = sortedOps.length > 0 ? sortedOps[0] : null;
                  
                  // Inizializziamo con la data di oggi
                  const operationData: CurrentOperationData = {
                    type: selectedOperationType,
                    date: today.toISOString(),
                    basketId: selectedBasketId,
                    cycleId: cycle.id,
                    // Per misura e peso, manteniamo i dati precedenti
                    ...((selectedOperationType === 'misura' || selectedOperationType === 'peso') && lastOperation ? {
                      sizeId: lastOperation.sizeId,
                      lotId: lastOperation.lotId,
                      sgrId: lastOperation.sgrId,
                      animalsPerKg: lastOperation.animalsPerKg,
                      deadCount: lastOperation.deadCount || null,
                      mortalityRate: lastOperation.mortalityRate || null,
                      animalCount: lastOperation.animalCount || null
                    } : {}),
                    notes: '',
                    // Calcoliamo i valori derivati per misura
                    ...(selectedOperationType === 'misura' && lastOperation?.animalsPerKg ? {
                      averageWeight: 1000000 / lastOperation.animalsPerKg
                    } : {})
                  };
                  
                  return (
                    <div>
                      <div className="space-y-4 mb-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Cesta</label>
                            <div className="p-2 rounded bg-gray-100">#{basket.physicalNumber}</div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Tipo operazione</label>
                            <div className="p-2 rounded bg-gray-100">
                              {getOperationTypeLabel(operationData.type)}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Data</label>
                          <Input 
                            type="date" 
                            defaultValue={format(today, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              operationData.date = new Date(e.target.value).toISOString();
                            }}
                            className="h-9"
                          />
                          <div className="flex items-center mt-1 text-xs text-amber-600">
                            <Clock className="w-3 h-3 mr-1" />
                            Modifica la data se hai già registrato un'operazione oggi
                          </div>
                        </div>
                        
                        {operationData.type === 'misura' && (
                          <div className="bg-muted/20 p-4 rounded-md border mb-4">
                            <div className="flex items-center mb-3">
                              <Calculator className="mr-2 h-5 w-5 text-primary" />
                              <h3 className="text-md font-medium">Calcolatore campione</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Calcola rapidamente i dati per l'operazione inserendo i valori del campione
                            </p>
                            
                            <IntegratedSampleCalculator 
                              defaultAnimalsPerKg={operationData.animalsPerKg || null}
                              defaultDeadCount={operationData.deadCount || null}
                              defaultAverageWeight={operationData.averageWeight || null}
                              defaultMortalityRate={operationData.mortalityRate || null}
                              onChange={(result) => {
                                console.log("Ricevuti nuovi valori calcolati:", result);
                                const updatedData = { ...operationData, ...result };
                                console.log("Dati operazione aggiornati:", updatedData);
                                setCurrentOperationData(updatedData);
                              }}
                            />
                          </div>
                        )}
                        
                        {operationData.type === 'peso' && (
                          <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                            <div className="flex items-center mb-3">
                              <ScaleIcon className="mr-2 h-5 w-5 text-blue-600" />
                              <h3 className="text-md font-medium">Registra peso totale</h3>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Inserisci il peso totale in kg della cesta e usa il pulsante "Calcola" per determinare il peso medio e gli animali per kg
                            </p>
                            
                            <div className="grid grid-cols-1 gap-4 mb-2">
                              <div>
                                <label className="block text-sm font-medium mb-1">Peso totale della cesta (kg)</label>
                                <div className="flex items-center">
                                  <Input 
                                    id="peso-totale-kg"
                                    type="number" 
                                    step="0.01"
                                    placeholder="Inserisci il peso in kg" 
                                    className="h-9"
                                    defaultValue=""
                                  />
                                  <div className="ml-2 px-3 py-2 bg-gray-100 text-gray-500 rounded">kg</div>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button 
                                  type="button"
                                  onClick={() => {
                                    // Verifichiamo prima se la data è valida
                                    const selectedDate = new Date(operationData.date);
                                    const selectedDateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
                                    
                                    // Cerca operazioni alla stessa data per questa cesta
                                    const hasOperationOnSameDate = basketOperations.some(op => {
                                      const opDate = new Date(op.date).toISOString().split('T')[0];
                                      return opDate === selectedDateString && op.type === operationData.type;
                                    });
                                    
                                    if (hasOperationOnSameDate) {
                                      toast({
                                        title: "Attenzione",
                                        description: `È già presente un'operazione di tipo ${getOperationTypeLabel(operationData.type)} per questa cesta alla data ${format(selectedDate, 'dd/MM/yyyy')}. Modifica la data prima di calcolare.`,
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Se la data è valida, procediamo con la validazione dell'input
                                    const input = document.getElementById('peso-totale-kg') as HTMLInputElement;
                                    if (!input || !input.value) {
                                      toast({
                                        title: "Errore",
                                        description: "Inserisci un peso totale valido prima di calcolare",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    const totalWeightKg = parseFloat(input.value);
                                    if (isNaN(totalWeightKg) || totalWeightKg <= 0) {
                                      toast({
                                        title: "Errore",
                                        description: "Inserisci un peso totale valido (maggiore di zero)",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Converti in grammi per il database
                                    const totalWeightGrams = totalWeightKg * 1000;
                                    console.log("Peso totale in grammi:", totalWeightGrams);

                                    // Ottieni il numero di animali dall'ultima operazione o dai dati correnti
                                    let animalCount = operationData.animalCount;
                                    
                                    // Se non abbiamo il numero di animali, lo prendiamo dall'ultima operazione
                                    if (!animalCount && lastOperation) {
                                      animalCount = lastOperation.animalCount;
                                    }
                                    
                                    if (!animalCount || animalCount <= 0) {
                                      toast({
                                        title: "Errore",
                                        description: "Numero di animali non disponibile. Verifica che sia presente nell'ultima operazione.",
                                        variant: "destructive"
                                      });
                                      return;
                                    }

                                    // Calcola animali per kg
                                    const animalsPerKg = Math.round(animalCount / totalWeightKg);
                                    
                                    // Calcola peso medio in mg
                                    const averageWeight = 1000000 / animalsPerKg;
                                    
                                    // Determina la taglia in base agli animali per kg direttamente dal database
                                    let sizeId = null;
                                    
                                    // Cerca la taglia direttamente tra quelle disponibili nel database
                                    if (sizes && sizes.length > 0) {
                                      const matchingSize = sizes.find(size => 
                                        animalsPerKg >= size.minAnimalsPerKg && animalsPerKg <= size.maxAnimalsPerKg
                                      );
                                      
                                      if (matchingSize) {
                                        sizeId = matchingSize.id;
                                        console.log(`Taglia calcolata direttamente dal database: ${matchingSize.code} (id: ${matchingSize.id})`);
                                      }
                                    }
                                    
                                    // Se non troviamo una corrispondenza esatta nel database, usiamo la logica predefinita
                                    if (!sizeId) {
                                      const targetSize = getSizeFromAnimalsPerKg(animalsPerKg, sizes);
                                      console.log("Taglia target calcolata con funzione di fallback:", targetSize);
                                      
                                      // Trova l'ID della taglia corrispondente nel database
                                      sizeId = targetSize ? 
                                        sizes?.find(s => s.code === targetSize.code)?.id || lastOperation?.sizeId : 
                                        lastOperation?.sizeId;
                                    }
                                      
                                    console.log("SizeId determinato:", sizeId);
                                    
                                    // Aggiorna i dati dell'operazione
                                    const updatedData = { 
                                      ...operationData,
                                      totalWeight: totalWeightGrams,
                                      animalsPerKg,
                                      averageWeight,
                                      animalCount,
                                      sizeId // Aggiorna l'ID della taglia
                                    };
                                    
                                    console.log("Dati operazione peso calcolati:", updatedData);
                                    setCurrentOperationData(updatedData);
                                    
                                    toast({
                                      title: "Calcolo completato",
                                      description: `Calcolati ${animalsPerKg} animali/kg con peso medio di ${Math.round(averageWeight)} mg`,
                                    });
                                  }}
                                  size="sm"
                                  className="bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 border border-blue-200"
                                >
                                  <Calculator className="mr-2 h-4 w-4" />
                                  Calcola
                                </Button>
                              </div>
                            </div>
                            
                            {/* Visualizza informazioni dalla misurazione precedente */}
                            {lastOperation && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-100">
                                <div>
                                  <span className="text-sm font-medium">Ultima misurazione</span>
                                  <div className="text-xs mt-1 text-muted-foreground">
                                    {format(new Date(lastOperation.date), 'dd/MM/yyyy', { locale: it })}
                                  </div>
                                </div>
                                {lastOperation.animalsPerKg && (
                                  <div>
                                    <span className="text-sm font-medium">Animali/kg precedente</span>
                                    <div className="text-xs mt-1 text-muted-foreground">
                                      {formatNumberWithCommas(lastOperation.animalsPerKg)}
                                    </div>
                                  </div>
                                )}
                                {lastOperation.animalCount && (
                                  <div>
                                    <span className="text-sm font-medium">Num. animali</span>
                                    <div className="text-xs mt-1 text-muted-foreground">
                                      {formatNumberWithCommas(lastOperation.animalCount)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4">
                          {operationData.type === 'misura' && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Animali/kg</label>
                              <Input 
                                type="number" 
                                value={operationData.animalsPerKg?.toString() || ''}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  
                                  // Crea una copia attuale dei dati per aggiornamento
                                  const updatedData = { ...operationData };
                                  updatedData.animalsPerKg = isNaN(value) ? null : value;
                                  
                                  // Aggiorna anche il peso medio se necessario
                                  if (!isNaN(value) && value > 0) {
                                    updatedData.averageWeight = 1000000 / value;
                                  } else {
                                    updatedData.averageWeight = null;
                                  }
                                  
                                  // Aggiorna lo stato completo, senza chiudere e riaprire il dialog
                                  console.log("Aggiorno dati operazione manualmente:", updatedData);
                                  setCurrentOperationData(updatedData);
                                }}
                                className="h-9"
                              />
                            </div>
                          )}
                          {operationData.type === 'misura' && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Peso medio (mg)</label>
                              <div className="p-2 rounded bg-gray-100">
                                {operationData.averageWeight ? formatNumberWithCommas(operationData.averageWeight) : "N/D"}
                              </div>
                            </div>
                          )}
                          
                          {operationData.type === 'peso' && operationData.animalsPerKg && (
                            <>
                              <div>
                                <label className="block text-sm font-medium mb-1">Animali/kg calcolati</label>
                                <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                                  {formatNumberWithCommas(operationData.animalsPerKg)}
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Peso medio (mg)</label>
                                <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                                  {operationData.averageWeight ? formatNumberWithCommas(operationData.averageWeight) : "N/D"}
                                </div>
                              </div>
                              {operationData.animalCount && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Numero animali</label>
                                  <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                                    {formatNumberWithCommas(operationData.animalCount)}
                                  </div>
                                </div>
                              )}
                              {operationData.totalWeight && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Peso totale (kg)</label>
                                  <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                                    {formatNumberWithCommas(operationData.totalWeight / 1000)}
                                  </div>
                                </div>
                              )}
                              {operationData.sizeId && sizes && (
                                <div>
                                  <label className="block text-sm font-medium mb-1">Taglia calcolata</label>
                                  <div className="p-2 rounded bg-blue-50 border border-blue-100 text-blue-700 font-medium">
                                    {(() => {
                                      const size = sizes.find((s: any) => s.id === operationData.sizeId);
                                      return size ? `${size.code} - ${size.name}` : 'Sconosciuta';
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* La sezione mortalità è stata integrata nel calcolatore campione */}
                      </div>
                      
                      <div className="flex justify-between items-center mt-6">
                        {/* Pulsante elimina per l'ultima operazione */}
                        {lastOperation && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              handleDeleteOperation(lastOperation.id);
                              setOperationDialogOpen(false);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                            Elimina Ultima Operazione
                          </Button>
                        )}
                        
                        <div className="flex ml-auto space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setOperationDialogOpen(false)}
                          >
                            Annulla
                          </Button>
                          <Button 
                            onClick={() => {
                              const selectedDate = new Date(operationData.date);
                              const selectedDateString = selectedDate.toISOString().split("T")[0];
                              const hasOperationOnSameDate = basketOperations.some(op => {
                                const opDate = new Date(op.date).toISOString().split("T")[0];
                                return opDate === selectedDateString && op.type === operationData.type;
                              });
                              if (hasOperationOnSameDate) {
                                toast({
                                  title: "Attenzione",
                                  description: `È già presente un'operazione di tipo ${getOperationTypeLabel(operationData.type)} per questa cesta alla data ${format(selectedDate, 'dd/MM/yyyy')}. Modifica la data prima di salvare.`,
                                  variant: "destructive"
                                });
                                return;
                              }
                              createOperationMutation.mutate(operationData);
                            }}
                            disabled={createOperationMutation.isPending}
                          >
                            {createOperationMutation.isPending ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Salvataggio...
                              </>
                            ) : "Salva Operazione"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <p className="text-center text-muted-foreground mb-4">
                        Questo tipo di operazione richiede un modulo più complesso.
                        Utilizza la pagina "Operazioni" per registrare un'operazione più dettagliata.
                      </p>
                      <div className="flex justify-between items-center">
                        {lastOperation && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => {
                              handleDeleteOperation(lastOperation.id);
                              setOperationDialogOpen(false);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                            Elimina Ultima Operazione
                          </Button>
                        )}
                        <Button variant="outline" className={lastOperation ? "ml-auto" : ""} onClick={() => setOperationDialogOpen(false)}>
                          Chiudi
                        </Button>
                      </div>
                    </div>
                  );
                }
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}