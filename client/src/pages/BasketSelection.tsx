import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fan, Filter, Info, RefreshCw, ShoppingCart, PackageCheck } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import { getTargetSizeForWeight } from '@/lib/utils';
import { it } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Definizione tipi per le interfacce principali
interface Size {
  id: number;
  code: string;
  name: string;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
  minWeight?: number;
  maxWeight?: number;
}

interface Operation {
  id: number;
  basketId: number;
  date: string;
  type: string;
  animalsPerKg: number | null;
  animalCount: number | null;
  deadCount: number | null;
  mortalityRate: number | null;
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: 'active' | 'closed';
}

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: 'SX' | 'DX' | null;
  position: number | null;
  state: 'active' | 'available';
  currentCycleId: number | null;
}

interface Flupsy {
  id: number;
  name: string;
  location: string;
}

// Componente per il conteggio degli animali per taglia
function SizeCountSummary({ 
  selectedBaskets, 
  operations, 
  sizes 
}: { 
  selectedBaskets: number[], 
  operations: Operation[] | undefined, 
  sizes: Size[] | undefined 
}) {
  // Raggruppa i cestelli selezionati per taglia
  const countBySize = useMemo(() => {
    if (!selectedBaskets || !operations || !sizes) return [];
    
    const sizeCounts: Record<string, any> = {};
    
    // Inizializza tutte le taglie con zero conteggio
    sizes.forEach(size => {
      sizeCounts[size.code] = {
        code: size.code,
        name: size.name,
        count: 0,
        basketCount: 0,
        minWeight: size.minWeight || 0
      };
    });
    
    // Calcola il conteggio per ogni taglia
    selectedBaskets.forEach(basketId => {
      // Trova l'ultima operazione per questo cestello
      const basketOperations = operations
        .filter(op => op.basketId === basketId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (basketOperations.length > 0) {
        const latestOp = basketOperations[0];
        
        // Calcola peso e taglia
        if (latestOp.animalsPerKg) {
          const weight = Math.round(1000000 / latestOp.animalsPerKg);
          const size = getTargetSizeForWeight(weight, sizes);
          
          if (size && sizeCounts[size.code]) {
            sizeCounts[size.code].count += latestOp.animalCount || 0;
            sizeCounts[size.code].basketCount += 1;
          }
        }
      }
    });
    
    // Converti in array e ordina per codice taglia
    return Object.values(sizeCounts)
      .filter(entry => entry.basketCount > 0)
      .sort((a, b) => {
        // Estrai numeri dalle taglie TP-xxx
        const numA = parseInt(a.code.replace('TP-', ''));
        const numB = parseInt(b.code.replace('TP-', ''));
        return numA - numB;
      });
  }, [selectedBaskets, operations, sizes]);
  
  // Calcola il totale degli animali
  const totalAnimals = useMemo(() => {
    return countBySize.reduce((sum, item) => sum + item.count, 0);
  }, [countBySize]);
  
  // Formatta il numero in stile europeo (migliaia separate da punto)
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Riepilogo Selezione</CardTitle>
        <CardDescription>
          Animali selezionati per taglia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {countBySize.map((item) => (
            <div 
              key={item.code} 
              className="bg-white rounded-lg border p-3 shadow-sm flex flex-col items-center"
            >
              <Badge 
                variant="outline" 
                className={getSizeColorClass(item.code)}
              >
                {item.code}
              </Badge>
              <div className="text-sm mt-1">{item.name}</div>
              <div className="text-2xl font-bold mt-2">{formatNumber(item.count)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {item.basketCount} {item.basketCount === 1 ? 'cesta' : 'ceste'}
              </div>
            </div>
          ))}
          
          {countBySize.length === 0 && (
            <div className="col-span-full text-center py-4 text-gray-500">
              Nessuna cesta selezionata
            </div>
          )}
        </div>
        
        {countBySize.length > 0 && (
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Totale animali selezionati</div>
              <div className="text-2xl font-bold">{formatNumber(totalAnimals)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Totale ceste selezionate</div>
              <div className="text-xl font-bold text-center">
                {selectedBaskets.length}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente per i filtri di selezione
function SelectionFilters({ 
  filters, 
  setFilters, 
  sizes, 
  applyFilters,
  resetFilters,
  selectedSizes, 
  setSelectedSizes,
  isLoading
}) {
  // Data per il filtro "Ultima operazione prima di"
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const handleSizeToggle = (sizeCode) => {
    setSelectedSizes(prev => {
      if (prev.includes(sizeCode)) {
        return prev.filter(s => s !== sizeCode);
      } else {
        return [...prev, sizeCode];
      }
    });
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Filtri di Selezione</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={resetFilters}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <CardDescription>
          Seleziona i criteri per filtrare i cestelli
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Taglie */}
          <div>
            <Label className="mb-2 block">Taglie</Label>
            <div className="flex flex-wrap gap-2">
              {sizes?.map(size => (
                <Badge 
                  key={size.code}
                  variant={selectedSizes.includes(size.code) ? "default" : "outline"}
                  className={`cursor-pointer ${selectedSizes.includes(size.code) ? getSizeColorClass(size.code) : ''}`}
                  onClick={() => handleSizeToggle(size.code)}
                >
                  {size.code}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Età minima/massima (giorni) */}
          <div>
            <Label className="mb-2 block">Età del ciclo (giorni)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Minima: {filters.minAge} giorni</Label>
                <Slider 
                  value={[filters.minAge]} 
                  min={0} 
                  max={500} 
                  step={5}
                  onValueChange={(value) => setFilters({...filters, minAge: value[0]})}
                  className="my-2"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Massima: {filters.maxAge === 1000 ? 'Nessun limite' : `${filters.maxAge} giorni`}</Label>
                <Slider 
                  value={[filters.maxAge]} 
                  min={0} 
                  max={1000} 
                  step={10}
                  onValueChange={(value) => setFilters({...filters, maxAge: value[0]})}
                  className="my-2"
                />
              </div>
            </div>
          </div>
          
          {/* Numero di animali */}
          <div>
            <Label className="mb-2 block">Numero di animali per cesta</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Min: {filters.minAnimals === 0 ? 'Nessun limite' : formatNumber(filters.minAnimals)}</Label>
                <Slider 
                  value={[filters.minAnimals]} 
                  min={0} 
                  max={100000} 
                  step={1000}
                  onValueChange={(value) => setFilters({...filters, minAnimals: value[0]})}
                  className="my-2"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Max: {filters.maxAnimals === 1000000 ? 'Nessun limite' : formatNumber(filters.maxAnimals)}</Label>
                <Slider 
                  value={[filters.maxAnimals]} 
                  min={10000} 
                  max={1000000} 
                  step={10000}
                  onValueChange={(value) => setFilters({...filters, maxAnimals: value[0]})}
                  className="my-2"
                />
              </div>
            </div>
          </div>
          
          {/* Tasso di mortalità */}
          <div>
            <Label className="mb-2 block">Tasso di mortalità massimo</Label>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Max: {filters.maxMortality === 100 ? 'Nessun limite' : `${filters.maxMortality}%`}</Label>
                <Slider 
                  value={[filters.maxMortality]} 
                  min={0} 
                  max={100} 
                  step={1}
                  onValueChange={(value) => setFilters({...filters, maxMortality: value[0]})}
                  className="my-2"
                />
              </div>
            </div>
          </div>
          
          {/* SGR (Tasso di crescita) */}
          <div>
            <Label className="mb-2 block">Tasso di crescita SGR (giornaliero)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Min: {filters.minSgr}%</Label>
                <Slider 
                  value={[filters.minSgr * 100]} 
                  min={0} 
                  max={10} 
                  step={0.1}
                  onValueChange={(value) => setFilters({...filters, minSgr: value[0] / 100})}
                  className="my-2"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Max: {filters.maxSgr === 1 ? 'Nessun limite' : `${filters.maxSgr * 100}%`}</Label>
                <Slider 
                  value={[filters.maxSgr * 100]} 
                  min={0} 
                  max={10} 
                  step={0.1}
                  onValueChange={(value) => setFilters({...filters, maxSgr: value[0] / 100})}
                  className="my-2"
                />
              </div>
            </div>
          </div>
          
          {/* Data ultima operazione */}
          <div>
            <Label className="mb-2 block">Ultima operazione</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      {filters.lastOperationDate 
                        ? format(parseISO(filters.lastOperationDate), 'dd/MM/yyyy')
                        : 'Seleziona data...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      locale={it}
                      selected={filters.lastOperationDate ? parseISO(filters.lastOperationDate) : undefined}
                      onSelect={(date) => {
                        setFilters({
                          ...filters, 
                          lastOperationDate: date ? format(date, 'yyyy-MM-dd') : null
                        });
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Select
                  value={filters.lastOperationType}
                  onValueChange={(value) => setFilters({...filters, lastOperationType: value})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tipo di operazione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualsiasi</SelectItem>
                    <SelectItem value="misurazione">Misurazione</SelectItem>
                    <SelectItem value="peso">Peso</SelectItem>
                    <SelectItem value="semina">Semina</SelectItem>
                    <SelectItem value="pulizia">Pulizia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={applyFilters}
          disabled={isLoading}
        >
          <Filter className="h-4 w-4 mr-2" />
          Applica Filtri
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper function per ottenere le classi CSS per una taglia
const getSizeColorClass = (sizeCode: string): string => {
  // Verifica se il codice della taglia è TP-10000 o superiore
  if (sizeCode.startsWith('TP-') && parseInt(sizeCode.replace('TP-', '')) >= 10000) {
    return 'bg-black !text-white !border-gray-800';
  }
  
  // Per le altre taglie TP, determina il colore in base al numero
  if (sizeCode.startsWith('TP-')) {
    // Estrai il numero dalla taglia
    const sizeNum = parseInt(sizeCode.replace('TP-', ''));
    
    if (sizeNum <= 500) {
      return 'bg-purple-500 !text-white !border-purple-700'; // TP-500 e inferiori
    } else if (sizeNum <= 1000) {
      return 'bg-pink-500 !text-white !border-pink-700';     // TP-1000 e similari
    } else if (sizeNum <= 2000) {  
      return 'bg-rose-500 !text-white !border-rose-700';     // TP-2000 e similari
    } else if (sizeNum <= 3000) {
      return 'bg-red-500 !text-white !border-red-700';       // TP-3000 e similari
    } else if (sizeNum <= 4000) {
      return 'bg-orange-500 !text-white !border-orange-700'; // TP-4000 e similari
    } else if (sizeNum <= 6000) {
      return 'bg-amber-500 !text-white !border-amber-700';   // TP-5000/6000
    } else if (sizeNum <= 7000) {
      return 'bg-lime-500 !text-white !border-lime-700';     // TP-7000
    } else if (sizeNum <= 8000) {
      return 'bg-green-500 !text-white !border-green-700';   // TP-8000
    } else if (sizeNum <= 9000) {
      return 'bg-teal-500 !text-white !border-teal-700';     // TP-9000
    }
  }
  
  // Default per taglie non riconosciute
  return 'bg-gray-200 !text-gray-800 !border-gray-400';
};

// Formatta il numero in stile europeo (migliaia separate da punto)
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export default function BasketSelection() {
  // Stati per i filtri e le selezioni
  const [filters, setFilters] = useState({
    minAge: 0,
    maxAge: 1000,
    minAnimals: 0,
    maxAnimals: 1000000,
    maxMortality: 100,
    minSgr: 0,
    maxSgr: 1,
    lastOperationDate: null,
    lastOperationType: 'any'
  });
  
  // Mantieni un elenco delle taglie selezionate per il filtro
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Stato per i flupsy selezionati
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  
  // Stato per le ceste selezionate
  const [selectedBaskets, setSelectedBaskets] = useState<number[]>([]);
  
  // Stato per la modalità di selezione
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('multiple');
  
  // Stato per il livello di zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Flag per tracciare l'applicazione del filtro
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  // Fetch dei dati necessari
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: baskets, isLoading: isLoadingBaskets } = useQuery({
    queryKey: ['/api/baskets'],
  });
  
  const { data: operations, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/operations'],
  });
  
  const { data: cycles, isLoading: isLoadingCycles } = useQuery({
    queryKey: ['/api/cycles'],
  });
  
  const { data: sizes, isLoading: isLoadingSizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  const { data: sgrs } = useQuery({
    queryKey: ['/api/sgrs'],
  });
  
  // Stato di caricamento complessivo
  const isLoading = isLoadingFlupsys || isLoadingBaskets || isLoadingOperations || 
                    isLoadingCycles || isLoadingSizes;
  
  // Inizializza i FLUPSY selezionati se ce n'è solo uno disponibile
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && selectedFlupsyIds.length === 0) {
      setSelectedFlupsyIds(flupsys.map(f => f.id));
    }
  }, [flupsys, selectedFlupsyIds]);
  
  // Helper function per ottenere il ciclo di un cestello
  const getCycleForBasket = (basketId) => {
    if (!cycles) return null;
    return cycles.find(c => c.basketId === basketId && c.state === 'active') || null;
  };
  
  // Helper function per ottenere le operazioni di un cestello
  const getOperationsForBasket = (basketId) => {
    if (!operations) return [];
    return operations.filter(op => op.basketId === basketId);
  };
  
  // Ottiene l'operazione più recente per un cestello
  const getLatestOperationForBasket = (basketId) => {
    const basketOperations = getOperationsForBasket(basketId);
    if (basketOperations.length === 0) return null;
    
    // Ordina per data (più recente prima)
    return [...basketOperations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
  };
  
  // Funzione per calcolare il tasso SGR da due operazioni
  const calculateSgrBetweenOperations = (firstOp, secondOp) => {
    if (!firstOp || !secondOp || !firstOp.animalsPerKg || !secondOp.animalsPerKg) return null;
    
    // Calcola i pesi in mg
    const firstWeight = 1000000 / firstOp.animalsPerKg;
    const secondWeight = 1000000 / secondOp.animalsPerKg;
    
    // Calcola il numero di giorni tra le due operazioni
    const days = differenceInDays(new Date(secondOp.date), new Date(firstOp.date));
    if (days <= 0) return null;
    
    // Calcola SGR usando la formula SGR = (ln(W2) - ln(W1)) / t
    const sgr = (Math.log(secondWeight) - Math.log(firstWeight)) / days;
    
    return sgr;
  };
  
  // Ottiene il SGR per un cestello
  const getSgrForBasket = (basketId) => {
    const basketOperations = getOperationsForBasket(basketId)
      .filter(op => op.animalsPerKg !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (basketOperations.length < 2) return null;
    
    // Calcola SGR tra le ultime due operazioni
    return calculateSgrBetweenOperations(basketOperations[1], basketOperations[0]);
  };
  
  // Calcola l'età di un ciclo in giorni
  const getCycleAge = (cycle) => {
    if (!cycle) return null;
    return differenceInDays(new Date(), new Date(cycle.startDate));
  };
  
  // Funzione per applicare i filtri
  const applyFilters = () => {
    setFiltersApplied(true);
    // La logica di filtro viene eseguita nel rendering, non c'è bisogno di fare altro qui
  };
  
  // Funzione per resettare i filtri
  const resetFilters = () => {
    setFilters({
      minAge: 0,
      maxAge: 1000,
      minAnimals: 0,
      maxAnimals: 1000000,
      maxMortality: 100,
      minSgr: 0,
      maxSgr: 1,
      lastOperationDate: null,
      lastOperationType: 'any'
    });
    setSelectedSizes([]);
    setFiltersApplied(false);
    setSelectedBaskets([]);
  };
  
  // Ottiene le ceste filtrate
  const filteredBaskets = useMemo(() => {
    if (!baskets || !selectedFlupsyIds || selectedFlupsyIds.length === 0) return [];
    
    // Filtra per FLUPSY selezionati
    let filtered = baskets.filter(b => 
      selectedFlupsyIds.includes(b.flupsyId) && b.state === 'active'
    );
    
    // Se i filtri non sono stati applicati, restituisci tutte le ceste
    if (!filtersApplied) return filtered;
    
    // Applica i filtri
    filtered = filtered.filter(basket => {
      const cycle = getCycleForBasket(basket.id);
      if (!cycle) return false;
      
      // Filtra per età del ciclo
      const cycleAge = getCycleAge(cycle);
      if (cycleAge === null || cycleAge < filters.minAge || (filters.maxAge < 1000 && cycleAge > filters.maxAge)) {
        return false;
      }
      
      // Ottieni l'ultima operazione
      const latestOp = getLatestOperationForBasket(basket.id);
      if (!latestOp) return false;
      
      // Filtra per tipo di operazione
      if (filters.lastOperationType !== 'any' && latestOp.type !== filters.lastOperationType) {
        return false;
      }
      
      // Filtra per data dell'ultima operazione
      if (filters.lastOperationDate) {
        const opDate = new Date(latestOp.date);
        const filterDate = parseISO(filters.lastOperationDate);
        if (opDate > filterDate) {
          return false;
        }
      }
      
      // Filtra per numero di animali
      if (latestOp.animalCount) {
        if (latestOp.animalCount < filters.minAnimals || latestOp.animalCount > filters.maxAnimals) {
          return false;
        }
      }
      
      // Filtra per tasso di mortalità
      const mortalityRate = latestOp.mortalityRate || 0;
      if (mortalityRate > filters.maxMortality) {
        return false;
      }
      
      // Filtra per SGR
      const sgr = getSgrForBasket(basket.id);
      if (sgr !== null) {
        if (sgr < filters.minSgr || sgr > filters.maxSgr) {
          return false;
        }
      }
      
      // Filtra per taglia
      if (selectedSizes.length > 0 && latestOp.animalsPerKg) {
        const weight = 1000000 / latestOp.animalsPerKg;
        const size = getTargetSizeForWeight(weight, sizes);
        if (!size || !selectedSizes.includes(size.code)) {
          return false;
        }
      }
      
      return true;
    });
    
    return filtered;
  }, [baskets, selectedFlupsyIds, filters, filtersApplied, cycles, operations, selectedSizes, sizes]);
  
  // Organizza i cestelli per FLUPSY
  const basketsByFlupsy = useMemo(() => {
    if (!filteredBaskets || !selectedFlupsyIds) return {};
    
    const result: Record<number, any> = {};
    selectedFlupsyIds.forEach(id => {
      result[id] = filteredBaskets.filter(b => b.flupsyId === id);
    });
    
    return result;
  }, [filteredBaskets, selectedFlupsyIds]);
  
  // Funzione per gestire il toggle della selezione di un cestello
  const toggleBasketSelection = (basketId) => {
    setSelectedBaskets(prev => {
      if (selectionMode === 'single') {
        // In modalità singola, sostituisci la selezione
        return prev.includes(basketId) ? [] : [basketId];
      } else {
        // In modalità multipla, aggiungi o rimuovi dalla selezione
        if (prev.includes(basketId)) {
          return prev.filter(id => id !== basketId);
        } else {
          return [...prev, basketId];
        }
      }
    });
  };
  
  // Funzione per selezionare tutte le ceste filtrate
  const selectAllFilteredBaskets = () => {
    setSelectedBaskets(filteredBaskets.map(b => b.id));
  };
  
  // Funzione per deselezionare tutte le ceste
  const clearSelection = () => {
    setSelectedBaskets([]);
  };
  
  // Ottiene le dimensioni delle carte dei cestelli in base al livello di zoom
  const getBasketCardSize = () => {
    switch (zoomLevel) {
      case 1:
        return { width: 'w-44', height: 'h-22' }; // Default
      case 2:
        return { width: 'w-56', height: 'h-28' }; // Medio
      case 3:
        return { width: 'w-72', height: 'h-32' }; // Grande
      default:
        return { width: 'w-44', height: 'h-22' };
    }
  };
  
  // Renderizza un cestello
  const renderBasket = (basket) => {
    const cardSize = getBasketCardSize();
    const width = cardSize.width;
    const height = cardSize.height;
    
    if (!basket) return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`basket-card p-2 rounded border-2 border-dashed border-gray-300 ${height} ${width} flex items-center justify-center text-gray-400 text-xs cursor-pointer`}>
              Vuoto
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white text-gray-900 border-2 border-gray-300 shadow-md">
            <div className="p-2 max-w-xs">
              <div className="font-medium text-gray-700 mb-1">Posizione non assegnata</div>
              <div className="text-sm text-gray-600">
                Nessun cestello presente in questa posizione.
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    const latestOperation = getLatestOperationForBasket(basket.id);
    const cycle = getCycleForBasket(basket.id);
    
    // Calcola il peso medio attuale
    const currentWeight = latestOperation?.animalsPerKg 
      ? Math.round(1000000 / latestOperation.animalsPerKg) 
      : null;
    
    // Determina la taglia attuale
    const currentSize = currentWeight 
      ? getTargetSizeForWeight(currentWeight, sizes) 
      : null;
    
    // Classe CSS per il colore del cestello
    const colorClass = currentSize?.code 
      ? getSizeColorClass(currentSize.code) 
      : 'bg-gray-100 text-gray-800 border-gray-300';
    
    // Classe per il bordo selezionato
    const selectedClass = selectedBaskets.includes(basket.id) 
      ? 'border-4 shadow-lg' 
      : 'border-2';
    
    // Calcola l'età del ciclo
    const cycleAge = cycle ? getCycleAge(cycle) : null;
    
    // Prepara i dati per il tooltip
    const tooltipContent = () => {
      const sizeName = currentSize?.name || "N/A";
      const animalsPerKg = latestOperation?.animalsPerKg || "N/A";
      const animalCount = latestOperation?.animalCount || "N/A";
      return (
        <div className="p-2 max-w-xs">
          <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-500">Taglia:</div>
            <div>{currentSize?.code} - {sizeName}</div>
            <div className="text-gray-500">Peso:</div>
            <div>{currentWeight ? `${currentWeight} mg` : 'N/A'}</div>
            <div className="text-gray-500">Animali/kg:</div>
            <div>{animalsPerKg}</div>
            <div className="text-gray-500">N° animali:</div>
            <div>{typeof animalCount === 'number' ? formatNumber(animalCount) : animalCount}</div>
            
            {latestOperation?.mortalityRate !== null && (
              <>
                <div className="text-gray-500">Mortalità:</div>
                <div>{latestOperation.mortalityRate}%</div>
              </>
            )}
            
            {latestOperation && (
              <>
                <div className="text-gray-500">Ultima operazione:</div>
                <div>{latestOperation.type} ({format(new Date(latestOperation.date), 'dd/MM/yyyy')})</div>
              </>
            )}
            
            {cycle && (
              <>
                <div className="text-gray-500">Ciclo:</div>
                <div>#{cycle.id} (da {format(new Date(cycle.startDate), 'dd/MM/yyyy')})</div>
                {cycleAge !== null && (
                  <>
                    <div className="text-gray-500">Età ciclo:</div>
                    <div>{cycleAge} giorni</div>
                  </>
                )}
              </>
            )}
            
            {/* Mostra SGR se disponibile */}
            {getSgrForBasket(basket.id) !== null && (
              <>
                <div className="text-gray-500">SGR giornaliero:</div>
                <div>{(getSgrForBasket(basket.id) * 100).toFixed(3)}%</div>
              </>
            )}
          </div>
        </div>
      );
    };
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`basket-card p-3 rounded ${selectedClass} ${colorClass} ${height} ${width} flex flex-col justify-between cursor-pointer overflow-hidden transition-all`}
              onClick={() => toggleBasketSelection(basket.id)}
            >
              <div className="flex justify-between items-start w-full">
                <span className="font-bold text-xs">#{basket.physicalNumber}</span>
                {cycle && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                    {cycleAge} g
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-col items-center justify-center grow">
                {currentSize && (
                  <Badge variant="outline" className="mb-1">
                    {currentSize.code}
                  </Badge>
                )}
                
                {latestOperation?.animalCount && (
                  <div className="text-center">
                    <div className="text-xs opacity-70">Animali:</div>
                    <div className="font-bold text-sm">{formatNumber(latestOperation.animalCount)}</div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-end w-full text-xs">
                <div>
                  {latestOperation && format(new Date(latestOperation.date), 'dd/MM')}
                </div>
                <div>
                  {getSgrForBasket(basket.id) !== null && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                      {(getSgrForBasket(basket.id) * 100).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-white text-gray-900 border-2 border-gray-300 shadow-md">
            {tooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // Renderizza un FLUPSY
  const renderFlupsy = (flupsyId) => {
    if (!flupsys || !baskets) return null;
    
    const flupsy = flupsys.find(f => f.id === flupsyId);
    if (!flupsy) return null;
    
    const fluspyBaskets = baskets.filter(b => b.flupsyId === flupsyId);
    
    // Estrai le righe (es. SX, DX) disponibili
    const rows = [...new Set(fluspyBaskets.map(b => b.row))].filter(Boolean).sort();
    
    // Calcola il numero massimo di posizioni tra tutte le righe
    const maxPosition = Math.max(
      ...fluspyBaskets.map(b => b.position || 0), 
      8 // Minimo 8 posizioni per visualizzazione
    );
    
    // Crea una matrice di cestelli
    const basketMatrix: Record<string, any[]> = {};
    rows.forEach(row => {
      basketMatrix[row] = Array(maxPosition).fill(null);
    });
    
    // Riempi la matrice con i cestelli
    fluspyBaskets.forEach(basket => {
      if (basket.row && basket.position !== null) {
        basketMatrix[basket.row][basket.position - 1] = basket;
      }
    });
    
    return (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-medium">{flupsy.name}</h3>
          <Badge variant="outline" className="ml-2">{flupsy.location}</Badge>
        </div>
        
        <div className="relative mb-4 flex justify-center">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center text-blue-700 border-2 border-blue-300">
            <Fan className="w-10 h-10 animate-spin-slow" />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-blue-500 absolute top-0 right-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-white p-2 text-sm">
                L'icona centrale rappresenta il motore/elica del FLUPSY
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="space-y-6">
          {rows.map(row => (
            <div key={row} className="rounded-md">
              <div className="flex items-center mb-2">
                <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                  Fila {row}
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {basketMatrix[row].map((basket, position) => (
                  <div key={position} className="flex items-center justify-center">
                    {renderBasket(basket)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Cestelli senza posizione */}
          {fluspyBaskets.filter(b => !b.row || b.position === null).length > 0 && (
            <div className="rounded-md">
              <div className="flex items-center mb-2">
                <div className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                  Cestelli senza posizione
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-2">
                {fluspyBaskets
                  .filter(b => !b.row || b.position === null)
                  .map(basket => (
                    <div key={basket.id} className="flex items-center justify-center">
                      {renderBasket(basket)}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Selezione Ceste per Ordini</CardTitle>
          <CardDescription>
            Seleziona le ceste che soddisfano criteri specifici per gli ordini dei clienti
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-7 gap-6">
            <div className="md:col-span-5">
              {/* Sommario numerico */}
              <SizeCountSummary 
                selectedBaskets={selectedBaskets} 
                operations={operations} 
                sizes={sizes} 
              />
              
              {/* Filtri di selezione */}
              <SelectionFilters 
                filters={filters}
                setFilters={setFilters}
                sizes={sizes}
                applyFilters={applyFilters}
                resetFilters={resetFilters}
                selectedSizes={selectedSizes}
                setSelectedSizes={setSelectedSizes}
                isLoading={isLoading}
              />
            </div>
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Controlli</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controlli per la modalità di selezione */}
                  <div>
                    <Label>Modalità Selezione</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        variant={selectionMode === 'single' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectionMode('single')}
                      >
                        Singola
                      </Button>
                      <Button
                        variant={selectionMode === 'multiple' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectionMode('multiple')}
                      >
                        Multipla
                      </Button>
                    </div>
                  </div>
                  
                  {/* Controlli per lo zoom */}
                  <div>
                    <Label>Livello Zoom</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        variant={zoomLevel === 1 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setZoomLevel(1)}
                      >
                        Piccolo
                      </Button>
                      <Button
                        variant={zoomLevel === 2 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setZoomLevel(2)}
                      >
                        Medio
                      </Button>
                      <Button
                        variant={zoomLevel === 3 ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setZoomLevel(3)}
                      >
                        Grande
                      </Button>
                    </div>
                  </div>
                  
                  {/* Azioni di selezione */}
                  <div>
                    <Label>Azioni</Label>
                    <div className="space-y-2 mt-2">
                      <Button 
                        className="w-full"
                        onClick={selectAllFilteredBaskets}
                        disabled={isLoading || filteredBaskets.length === 0}
                      >
                        <PackageCheck className="h-4 w-4 mr-2" />
                        Seleziona Tutti ({filteredBaskets.length})
                      </Button>
                      <Button 
                        className="w-full"
                        variant="outline"
                        onClick={clearSelection}
                        disabled={selectedBaskets.length === 0}
                      >
                        Deseleziona Tutti
                      </Button>
                    </div>
                  </div>
                  
                  {/* Statistiche */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">Statistiche Selezione</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ceste Disponibili:</span>
                        <span className="font-medium">{filteredBaskets.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ceste Selezionate:</span>
                        <span className="font-medium">{selectedBaskets.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Percentuale:</span>
                        <span className="font-medium">
                          {filteredBaskets.length > 0 
                            ? `${Math.round((selectedBaskets.length / filteredBaskets.length) * 100)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Visualizzazione dei FLUPSY */}
          <div className="mt-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-60 text-gray-500">
                <div className="flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 mb-2 animate-spin" />
                  <p>Caricamento in corso...</p>
                </div>
              </div>
            ) : (
              <div>
                {selectedFlupsyIds.map(flupsyId => (
                  <div key={flupsyId}>
                    {renderFlupsy(flupsyId)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}