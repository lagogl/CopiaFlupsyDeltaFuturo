import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Zap, Filter, BarChart, Layers, AlertCircle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { formatNumberWithCommas, getOperationTypeLabel, getOperationTypeColor, getBasketColorBySize } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import SampleCalculator, { SampleCalculatorResult } from '@/components/SampleCalculator';

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
  notes?: string | null;
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
          className="flex-1 h-8 text-xs"
          onClick={() => onQuickOperation(basket.id, 'pulizia')}
        >
          Pulizia
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
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [currentOperationData, setCurrentOperationData] = useState<CurrentOperationData | null>(null);
  // Questo oggetto contiene i dati più recenti del calcolatore e persiste tra le sessioni di dialogo
  const [calculatorResults, setCalculatorResults] = useState<SampleCalculatorResult | null>(null);
  // Importiamo useEffect
  const { useEffect } = React;
  
  // Questo effect si occupa di aggiornare il form con i dati del calcolatore quando disponibili
  useEffect(() => {
    if (calculatorResults && currentOperationData) {
      // Aggiorniamo i dati dell'operazione corrente
      setCurrentOperationData({
        ...currentOperationData,
        animalsPerKg: calculatorResults.animalsPerKg,
        averageWeight: calculatorResults.averageWeight,
        deadCount: calculatorResults.deadCount,
        mortalityRate: calculatorResults.mortalityRate
      });
      
      console.log("Form updated with calculator results via effect");
    }
  }, [calculatorResults]);
  
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
  
  // Mutazione per creare una nuova operazione
  const createOperationMutation = useMutation({
    mutationFn: (operationData: any) => {
      return apiRequest('POST', '/api/operations', operationData);
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
    
    // Prepara il form dell'operazione
    setSelectedBasketId(basketId);
    setSelectedOperationType(operationType);
    setOperationDialogOpen(true);
    
    // Non mostriamo più il toast qui, lo mostreremo solo quando l'operazione viene salvata con successo
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
  
  const isLoading = basketsLoading || flupsysLoading || operationsLoading || cyclesLoading || lotsLoading;
  
  // Gestisce i risultati del calcolatore
  const handleCalculatorResult = (result: SampleCalculatorResult) => {
    // Salviamo i risultati del calcolatore nello stato globale
    setCalculatorResults(result);
    
    console.log("Calculator result saved globally:", result);
    
    if (currentOperationData) {
      // Creiamo una copia dell'oggetto corrente per le modifiche
      const updatedData = { ...currentOperationData };
      
      // Aggiorniamo tutti i campi calcolati dal calcolatore
      updatedData.animalsPerKg = result.animalsPerKg;
      updatedData.averageWeight = result.averageWeight; // In mg per animale
      updatedData.deadCount = result.deadCount;
      updatedData.mortalityRate = result.mortalityRate;
      
      // Calcoliamo anche il valore derivato animalCount se possibile
      if (result.animalsPerKg && updatedData.batchWeight) {
        // animalCount = animalsPerKg * batchWeight (kg)
        const batchWeightKg = updatedData.batchWeight / 1000; // Convertiamo in kg
        updatedData.animalCount = Math.round(result.animalsPerKg * batchWeightKg);
      }
      
      console.log("Updated operation data:", updatedData);
      
      // Aggiorniamo lo stato con i nuovi dati
      setCurrentOperationData(updatedData);
    }
  };
  
  return (
    <div>
      <SampleCalculator 
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        onCalculate={handleCalculatorResult}
        defaultAnimalsPerKg={currentOperationData?.animalsPerKg}
        defaultDeadCount={currentOperationData?.deadCount}
      />
      
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
                onClick={() => handleBulkOperation('pulizia')}
              >
                Pulizia
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
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Animali/kg</label>
                          <div className="flex space-x-2">
                            <Input 
                              type="number" 
                              value={(calculatorResults?.animalsPerKg || operationData.animalsPerKg)?.toString() || ''}
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
                              className="h-9 flex-1"
                            />
                            <Button 
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 flex-shrink-0"
                              onClick={() => {
                                // Salviamo riferimento per l'aggiornamento dopo il calcolo
                                const updatedOperationData = {...operationData};
                                setCurrentOperationData(updatedOperationData);
                                
                                // Aggiungiamo una funzione di callback che verrà usata
                                // per aggiornare i valori del form dopo il calcolo
                                updatedOperationData.updateForm = () => {
                                  // Aggiorniamo il valore visibile nell'interfaccia utente
                                  const inputAnimalsPerKg = document.querySelector('input[placeholder="Animali/kg"]') as HTMLInputElement;
                                  if (inputAnimalsPerKg) {
                                    inputAnimalsPerKg.value = updatedOperationData.animalsPerKg?.toString() || '';
                                  }
                                  
                                  // Aggiorniamo il valore dei morti
                                  const inputDeadCount = document.querySelector('input[placeholder="N. animali morti"]') as HTMLInputElement;
                                  if (inputDeadCount) {
                                    inputDeadCount.value = updatedOperationData.deadCount?.toString() || '';
                                  }
                                  
                                  // Aggiorniamo i dati dell'operazione
                                  operationData.animalsPerKg = updatedOperationData.animalsPerKg;
                                  operationData.averageWeight = updatedOperationData.averageWeight;
                                  operationData.deadCount = updatedOperationData.deadCount;
                                  operationData.mortalityRate = updatedOperationData.mortalityRate;
                                  
                                  // Forziamo l'aggiornamento dell'interfaccia
                                  setOperationDialogOpen(prev => prev);
                                };
                                
                                setCalculatorOpen(true);
                              }}
                            >
                              <Calculator className="h-4 w-4" />
                            </Button>
                          </div>
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
                            onClick={() => createOperationMutation.mutate(operationData)}
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
                } else if (selectedOperationType === 'misura' || selectedOperationType === 'pulizia') {
                  // Per operazioni di pulizia o misura semplici
                  // Verifichiamo se esiste già un'operazione per oggi per questa cesta
                  const today = new Date();
                  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD
                  
                  // Ordinare le operazioni per data (più recenti prima)
                  const sortedOps = [...basketOperations].sort((a, b) => 
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                  const lastOperation = sortedOps.length > 0 ? sortedOps[0] : null;
                  
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
                  
                  const operationData: CurrentOperationData = {
                    type: selectedOperationType,
                    date: today.toISOString(),
                    basketId: selectedBasketId,
                    cycleId: cycle.id,
                    // Se è pulizia, non richiediamo altri dati
                    ...(selectedOperationType === 'misura' && lastOperation ? {
                      sizeId: lastOperation.sizeId,
                      lotId: lastOperation.lotId,
                      sgrId: lastOperation.sgrId,
                      animalsPerKg: lastOperation.animalsPerKg,
                      deadCount: lastOperation.deadCount || null,
                      mortalityRate: lastOperation.mortalityRate || null
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
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {operationData.type === 'misura' && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Animali/kg</label>
                              <div className="flex space-x-2">
                                <Input 
                                  type="number" 
                                  defaultValue={operationData.animalsPerKg?.toString() || ''}
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
                                  className="h-9 flex-1"
                                />
                                <Button 
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 flex-shrink-0"
                                  onClick={() => {
                                    // Salviamo riferimento per l'aggiornamento dopo il calcolo
                                    const updatedOperationData = {...operationData};
                                    setCurrentOperationData(updatedOperationData);
                                    
                                    // Aggiungiamo una funzione di callback che verrà usata
                                    // per aggiornare i valori del form dopo il calcolo
                                    updatedOperationData.updateForm = () => {
                                      // Aggiorniamo i dati
                                      operationData.animalsPerKg = updatedOperationData.animalsPerKg;
                                      operationData.averageWeight = updatedOperationData.averageWeight;
                                      operationData.deadCount = updatedOperationData.deadCount;
                                      operationData.mortalityRate = updatedOperationData.mortalityRate;
                                      
                                      // Forziamo chiusura e riapertura del dialog per resettare il form
                                      setOperationDialogOpen(false);
                                      setTimeout(() => {
                                        setOperationDialogOpen(true);
                                      }, 50);
                                    };
                                    
                                    setCalculatorOpen(true);
                                  }}
                                >
                                  <Calculator className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium mb-1">Peso medio (mg)</label>
                            <div className="p-2 rounded bg-gray-100">
                              {operationData.averageWeight ? formatNumberWithCommas(operationData.averageWeight) : "N/D"}
                            </div>
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Numero di animali morti trovati
                          </p>
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
                            onClick={() => createOperationMutation.mutate(operationData)}
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