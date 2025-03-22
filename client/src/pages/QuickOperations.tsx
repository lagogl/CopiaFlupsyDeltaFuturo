import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Zap, Filter, BarChart, Layers, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumberWithCommas, getOperationTypeLabel, getOperationTypeColor, getBasketColorBySize } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  notes: string | null;
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
  onQuickOperation
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
          <div className="text-xs mt-1">{positionText}</div>
        </CardDescription>
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
              <div>
                <span className="font-medium">Ultima operazione:</span>{' '}
                <Badge variant="outline" className={getOperationTypeColor(lastOperation.type)}>
                  {getOperationTypeLabel(lastOperation.type)}
                </Badge>
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
  
  // Gestisce click su operazione rapida
  const handleQuickOperation = (basketId: number, operationType: string) => {
    setSelectedBasketId(basketId);
    setSelectedOperationType(operationType);
    setOperationDialogOpen(true);
    
    // Per ora mostreremo solo un toast
    toast({
      title: 'Operazione rapida attivata',
      description: `Basket #${basketId} - Operazione: ${operationType}`,
    });
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
  
  return (
    <div>
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
              />
            );
          })}
        </div>
      )}
      
      {/* Dialog per operazioni - implementazione dettagliata da fare */}
      <Dialog open={operationDialogOpen} onOpenChange={setOperationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedOperationType === 'duplicate' 
                ? 'Ripeti Ultima Operazione' 
                : `Nuova operazione: ${getOperationTypeLabel(selectedOperationType || '')}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-center text-muted-foreground">
              Implementazione completa da fare. Questo è un placeholder per il form di operazione rapida.
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOperationDialogOpen(false)}>
              Annulla
            </Button>
            <Button>
              Salva Operazione
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}