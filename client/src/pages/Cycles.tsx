import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getSizeColor } from '@/lib/sizeUtils';
import { 
  estimateDaysToReachSize, 
  estimateAverageWeightFromSize, 
  parseTagliaCode
} from '@/lib/sgrCalculations';
import { Eye, Search, Filter, InfoIcon, ArrowUp, ArrowDown, ArrowUpDown, Target, BarChart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'wouter';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Definizione dell'interfaccia Operation per tipizzare i dati delle operazioni
interface Operation {
  id: number;
  cycleId: number;
  type: string;
  date: string;
  lotId?: number;
  animalCount?: number;
  totalWeight?: number;
  averageWeight?: number;
  size?: {
    id: number;
    code: string;
    color?: string;
  };
  sgr?: {
    id: number;
    percentage: number;
  };
}

// Definizione dell'interfaccia Size per tipizzare i dati della taglia
interface Size {
  id: number;
  code: string;
  name: string;
}

// Definizione dell'interfaccia SGR per tipizzare i dati del tasso di crescita
interface SGR {
  id: number;
  percentage: number;
  month?: string;
}

// Definizione dell'interfaccia Lot per tipizzare i dati del lotto
interface Lot {
  id: number;
  supplier: string;
  arrivalDate: string;
}

// Definizione dell'interfaccia Flupsy per tipizzare i dati del FLUPSY
interface Flupsy {
  id: number;
  name: string;
  location?: string;
  maxPositions?: number;
}

// Definizione dell'interfaccia Basket per tipizzare i dati del cestello
interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
}

// Definizione dell'interfaccia Cycle per tipizzare i dati
interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: 'active' | 'closed';
  basket?: {
    physicalNumber: number;
  };
  currentSize?: Size;
  currentSgr?: SGR;
}

export default function Cycles() {
  // Filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flupsyFilter, setFlupsyFilter] = useState<number | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [lotFilter, setLotFilter] = useState<number | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  
  // Tab attiva
  const [activeTab, setActiveTab] = useState("cicli");
  
  // Taglia target per l'analisi delle performance
  const [targetSize, setTargetSize] = useState<string | null>(null);
  
  // Ordinamento
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
    multiSort: { key: string; direction: 'ascending' | 'descending' }[];
  }>({
    key: 'id',
    direction: 'descending',
    multiSort: []
  });
  
  // Query cycles with details
  const { data: cycles = [], isLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });
  
  // Query operations to check if any cycles were sold
  const { data: operations = [] } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });
  
  // Query FLUPSY data
  const { data: flupsys = [] } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  // Query baskets data
  const { data: baskets = [] } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Query lots data
  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ['/api/lots'],
  });
  
  // Query sizes data
  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });
  
  // Query SGR data
  const { data: sgrData = [] } = useQuery<SGR[]>({
    queryKey: ['/api/sgr'],
  });

  // Funzione per ottenere il valore SGR corretto per il mese corrente
  const getCurrentMonthSgr = () => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-based index (0 = gennaio, 11 = dicembre)
    
    // Converte l'indice del mese in nome italiano
    const monthNames = [
      'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
      'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
    ];
    
    const currentMonthName = monthNames[currentMonth];
    
    // Trova il valore SGR per il mese corrente
    const sgrForCurrentMonth = sgrData.find(s => s.month?.toLowerCase() === currentMonthName);
    
    return sgrForCurrentMonth?.percentage || 0;
  };
  
  // Funzione per ordinare i cicli
  const sortCycles = (cycleList: Cycle[], sortConf: typeof sortConfig) => {
    let sortedCycles = [...cycleList];
    
    // Funzione per confrontare i valori in base al tipo di campo
    const compareValues = (a: any, b: any, key: string, direction: 'ascending' | 'descending') => {
      // Gestisci valori nulli o undefined
      if (a === undefined || a === null) return direction === 'ascending' ? -1 : 1;
      if (b === undefined || b === null) return direction === 'ascending' ? 1 : -1;
      
      // Per le date, converti in oggetti Date
      if (key === 'startDate' || key === 'endDate') {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return direction === 'ascending' 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
      
      // Per i numeri
      if (typeof a === 'number' && typeof b === 'number') {
        return direction === 'ascending' ? a - b : b - a;
      }
      
      // Per le stringhe
      if (typeof a === 'string' && typeof b === 'string') {
        return direction === 'ascending' 
          ? a.localeCompare(b)
          : b.localeCompare(a);
      }
      
      // Default
      return direction === 'ascending' ? (a > b ? 1 : -1) : (a < b ? 1 : -1);
    };
    
    // Ordinamento primario
    if (sortConf.key) {
      sortedCycles.sort((a, b) => {
        let aValue, bValue;
        
        // Estrai i valori in base alla chiave di ordinamento
        switch (sortConf.key) {
          case 'id':
            aValue = a.id;
            bValue = b.id;
            break;
          case 'basket':
            aValue = a.basket?.physicalNumber || a.basketId;
            bValue = b.basket?.physicalNumber || b.basketId;
            break;
          case 'flupsy':
            // Cerca il FLUPSY per il cestello a
            const basketA = baskets.find(bsk => bsk.id === a.basketId);
            const flupsyA = basketA ? flupsys.find(f => f.id === basketA.flupsyId) : null;
            aValue = flupsyA?.name || '';
            
            // Cerca il FLUPSY per il cestello b
            const basketB = baskets.find(bsk => bsk.id === b.basketId);
            const flupsyB = basketB ? flupsys.find(f => f.id === basketB.flupsyId) : null;
            bValue = flupsyB?.name || '';
            break;
          case 'startDate':
            aValue = a.startDate;
            bValue = b.startDate;
            break;
          case 'endDate':
            aValue = a.endDate;
            bValue = b.endDate;
            break;
          case 'size':
            aValue = a.currentSize?.code || '';
            bValue = b.currentSize?.code || '';
            break;
          case 'lot':
            // Cerca l'operazione di prima attivazione per a
            const opA = operations.find(op => op.cycleId === a.id && op.type === 'prima-attivazione');
            const lotA = opA?.lotId ? lots.find(l => l.id === opA.lotId) : null;
            aValue = lotA?.supplier || '';
            
            // Cerca l'operazione di prima attivazione per b
            const opB = operations.find(op => op.cycleId === b.id && op.type === 'prima-attivazione');
            const lotB = opB?.lotId ? lots.find(l => l.id === opB.lotId) : null;
            bValue = lotB?.supplier || '';
            break;
          case 'sgr':
            aValue = a.currentSgr?.percentage || 0;
            bValue = b.currentSgr?.percentage || 0;
            break;
          default:
            aValue = (a as any)[sortConf.key];
            bValue = (b as any)[sortConf.key];
        }
        
        return compareValues(aValue, bValue, sortConf.key, sortConf.direction);
      });
    }
    
    // Ordinamento secondario (multi-sort)
    if (sortConf.multiSort && sortConf.multiSort.length > 0) {
      // Ordina per ogni criterio secondario
      sortConf.multiSort.forEach(secondaryCriterion => {
        if (secondaryCriterion.key !== sortConf.key) {
          sortedCycles = stableSort(sortedCycles, (a, b) => {
            let aValue, bValue;
            
            // Estrai i valori in base alla chiave di ordinamento secondario
            switch (secondaryCriterion.key) {
              case 'id':
                aValue = a.id;
                bValue = b.id;
                break;
              // Ripeti gli stessi casi dell'ordinamento primario
              // ...altri casi come sopra
              
              default:
                aValue = (a as any)[secondaryCriterion.key];
                bValue = (b as any)[secondaryCriterion.key];
            }
            
            return compareValues(aValue, bValue, secondaryCriterion.key, secondaryCriterion.direction);
          });
        }
      });
    }
    
    return sortedCycles;
  };
  
  // Funzione per ordinamento stabile
  const stableSort = <T,>(array: T[], compare: (a: T, b: T) => number): T[] => {
    return array
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const order = compare(a.item, b.item);
        return order !== 0 ? order : a.index - b.index;
      })
      .map(({ item }) => item);
  };

  // Gestore per il click sulle intestazioni delle colonne per l'ordinamento
  const handleSort = (key: string) => {
    setSortConfig(prevSortConfig => {
      // Se si clicca sulla stessa colonna, cambia direzione
      if (prevSortConfig.key === key) {
        const newDirection = prevSortConfig.direction === 'ascending' ? 'descending' : 'ascending';
        return {
          ...prevSortConfig,
          direction: newDirection,
        };
      }
      
      // Se si clicca su una nuova colonna, imposta come ordinamento primario
      // e aggiungi il precedente ordinamento primario al multiSort
      const newMultiSort = prevSortConfig.key 
        ? [{ key: prevSortConfig.key, direction: prevSortConfig.direction }, 
           ...prevSortConfig.multiSort.filter(item => item.key !== key).slice(0, 2)]
        : [];
      
      return {
        key,
        direction: 'ascending',
        multiSort: newMultiSort
      };
    });
  };
  
  // Filter cycles
  const filteredCycles = cycles.filter((cycle: Cycle) => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${cycle.id}`.includes(searchTerm) || 
      `${cycle.basketId}`.includes(searchTerm);
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && cycle.state === 'active') ||
      (statusFilter === 'closed' && cycle.state === 'closed');
    
    // Filter by flupsy
    const matchesFlupsy = flupsyFilter === null || (() => {
      const basket = baskets.find(b => b.id === cycle.basketId);
      return basket && basket.flupsyId === flupsyFilter;
    })();
    
    // Filter by tag
    const matchesTag = tagFilter === null || 
      (cycle.currentSize && cycle.currentSize.code === tagFilter);
    
    // Filter by lot
    const matchesLot = lotFilter === null || (() => {
      const primaAttivazione = operations.find(
        op => op.cycleId === cycle.id && op.type === 'prima-attivazione'
      );
      return primaAttivazione && primaAttivazione.lotId === lotFilter;
    })();
    
    // Filter by date range
    const matchesDateRange = (() => {
      if (!dateRangeFilter.start && !dateRangeFilter.end) return true;
      
      const cycleStartDate = new Date(cycle.startDate);
      
      if (dateRangeFilter.start && dateRangeFilter.end) {
        return cycleStartDate >= dateRangeFilter.start && cycleStartDate <= dateRangeFilter.end;
      } else if (dateRangeFilter.start) {
        return cycleStartDate >= dateRangeFilter.start;
      } else if (dateRangeFilter.end) {
        return cycleStartDate <= dateRangeFilter.end;
      }
      
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesFlupsy && matchesTag && matchesLot && matchesDateRange;
  });
  
  // Apply sorting
  const sortedFilteredCycles = useMemo(() => 
    sortCycles(filteredCycles, sortConfig), 
    [filteredCycles, sortConfig, baskets, flupsys, lots, operations]);

  // Calcola il tempo necessario per raggiungere una taglia target
  const calculateDaysToReachTarget = (cycle: Cycle, targetSizeCode: string | null): number => {
    if (!cycle.currentSize || !cycle.currentSgr || !targetSizeCode) return 0;
    
    const currentSizeCode = cycle.currentSize.code;
    
    // Utilizziamo il valore SGR del ciclo (che è giornaliero)
    const sgrPercentage = cycle.currentSgr.percentage;
    
    // Calcola peso corrente e peso target
    const currentWeight = estimateAverageWeightFromSize(currentSizeCode);
    const targetWeight = estimateAverageWeightFromSize(targetSizeCode);
    
    if (!currentWeight || !targetWeight) return 0;
    
    // Se il peso target è inferiore o uguale al peso corrente, non serve calcolare
    if (targetWeight <= currentWeight) return 0;
    
    // Calcola giorni necessari usando l'SGR giornaliero
    return estimateDaysToReachSize(currentWeight, targetWeight, sgrPercentage);
  };
  
  // Calcola la data stimata di raggiungimento della taglia target
  const calculateTargetDate = (cycle: Cycle, daysNeeded: number): string => {
    if (!daysNeeded || daysNeeded <= 0) return '-';
    
    const today = new Date();
    const targetDate = addDays(today, daysNeeded);
    
    return format(targetDate, 'dd/MM/yyyy');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Cicli Produttivi</h2>
        <div className="flex space-x-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtra
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96">
              <div className="space-y-4">
                <h4 className="font-medium">Filtri Avanzati</h4>
                
                {/* Filtro per FLUPSY */}
                <div className="space-y-2">
                  <Label>FLUPSY</Label>
                  <Select 
                    value={flupsyFilter !== null ? String(flupsyFilter) : ''} 
                    onValueChange={(value) => setFlupsyFilter(value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti i FLUPSY" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tutti i FLUPSY</SelectItem>
                      {flupsys.map((flupsy) => (
                        <SelectItem key={flupsy.id} value={String(flupsy.id)}>
                          {flupsy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro per Taglia */}
                <div className="space-y-2">
                  <Label>Taglia</Label>
                  <Select 
                    value={tagFilter || ''} 
                    onValueChange={(value) => setTagFilter(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tutte le taglie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tutte le taglie</SelectItem>
                      {sizes.map((size) => (
                        <SelectItem key={size.id} value={size.code}>
                          <div className="flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ 
                                backgroundColor: getSizeColor(size.code) 
                              }}
                            />
                            {size.code}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro per Lotto */}
                <div className="space-y-2">
                  <Label>Lotto</Label>
                  <Select 
                    value={lotFilter !== null ? String(lotFilter) : ''} 
                    onValueChange={(value) => setLotFilter(value ? Number(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tutti i lotti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tutti i lotti</SelectItem>
                      {lots.map((lot) => (
                        <SelectItem key={lot.id} value={String(lot.id)}>
                          #{lot.id} - {lot.supplier} ({format(new Date(lot.arrivalDate), 'dd/MM/yy')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Filtro per Intervallo di Date */}
                <div className="space-y-2">
                  <Label>Periodo</Label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {dateRangeFilter.start ? (
                            format(dateRangeFilter.start, 'dd/MM/yyyy')
                          ) : (
                            <span className="text-muted-foreground">Data inizio</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRangeFilter.start || undefined}
                          onSelect={(date) => 
                            setDateRangeFilter(prev => ({ ...prev, start: date || null }))
                          }
                          locale={it}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {dateRangeFilter.end ? (
                            format(dateRangeFilter.end, 'dd/MM/yyyy')
                          ) : (
                            <span className="text-muted-foreground">Data fine</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRangeFilter.end || undefined}
                          onSelect={(date) => 
                            setDateRangeFilter(prev => ({ ...prev, end: date || null }))
                          }
                          locale={it}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Pulsante per resettare i filtri */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setFlupsyFilter(null);
                    setTagFilter(null);
                    setLotFilter(null);
                    setDateRangeFilter({ start: null, end: null });
                  }}
                >
                  Resetta filtri
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Filtri superiori */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Ricerca */}
        <div className="relative w-full xs:w-auto flex-1 xs:flex-none">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ID ciclo o cestello..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Filtro per stato */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="min-w-[140px]">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attivi</SelectItem>
            <SelectItem value="closed">Chiusi</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="cicli" value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="cicli">Cicli Produttivi</TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart className="h-4 w-4 mr-1" /> 
            Analisi Performance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="cicli">
          {/* Cycles Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>ID</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'id' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('basket')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Cestello</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'basket' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('flupsy')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>FLUPSY</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'flupsy' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('lot')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Lotto</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'lot' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Inizio</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'startDate' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Taglia</span>
                        <div className="flex flex-col">
                          {sortConfig.key === 'size' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sgr')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>SGR</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-3 w-3 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p className="text-xs">SGR (giornaliero): Specific Growth Rate</p>
                              <p className="text-xs">Tasso di crescita specifico giornaliero</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex flex-col">
                          {sortConfig.key === 'sgr' ? (
                            sortConfig.direction === 'ascending' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
                          ) : <ArrowUpDown className="h-2.5 w-2.5" />}
                        </div>
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Stato
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                    >
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFilteredCycles.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
                        {isLoading ? 'Caricamento in corso...' : 'Nessun ciclo trovato'}
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredCycles.map(cycle => {
                      // Cerca il cestello associato
                      const basket = baskets.find(b => b.id === cycle.basketId);
                      
                      // Cerca il FLUPSY associato
                      const flupsy = basket 
                        ? flupsys.find(f => f.id === basket.flupsyId) 
                        : null;
                      
                      // Cerca se il ciclo è stato venduto
                      const hasVenditaOp = operations.some(
                        op => op.cycleId === cycle.id && op.type === 'vendita'
                      );
                      
                      // Cerca operazione di prima attivazione per trovare il lotto
                      const primaAttivazione = operations.find(
                        op => op.cycleId === cycle.id && op.type === 'prima-attivazione'
                      );
                      
                      const lot = primaAttivazione && primaAttivazione.lotId 
                        ? lots.find(l => l.id === primaAttivazione.lotId) 
                        : null;
                      
                      // Flag per cicli venduti
                      const isSoldCycle = hasVenditaOp || operations.some(
                        op => op.cycleId === cycle.id && op.type === 'selezione-vendita'
                      );
                      
                      return (
                        <tr key={cycle.id} className={isSoldCycle ? 'relative bg-red-50/20 hover:bg-gray-50' : 'hover:bg-gray-50'}>
                          {isSoldCycle && (
                            <div className="absolute inset-0 pointer-events-none" style={{ 
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,0,0,0.05) 10px, rgba(255,0,0,0.05) 20px)',
                              backgroundSize: '28px 28px'
                            }} />
                          )}
                          <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900 relative">
                            #{cycle.id}
                            {isSoldCycle && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="ml-1 inline-block">
                                      <Badge variant="destructive" className="h-3 rounded-full px-1">
                                        <span className="text-[8px]">V</span>
                                      </Badge>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    <p className="text-xs">Ciclo venduto</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                            {basket?.physicalNumber || cycle.basketId}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                            {flupsy?.name || 'N/D'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                            {lot ? `${lot.supplier} (#${lot.id})` : 'N/D'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                            {format(new Date(cycle.startDate), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs">
                            {cycle.currentSize && (
                              <Badge 
                                variant="outline"
                                style={{ 
                                  backgroundColor: `${getSizeColor(cycle.currentSize.code)}20`,
                                  borderColor: getSizeColor(cycle.currentSize.code),
                                  color: getSizeColor(cycle.currentSize.code) 
                                }}
                              >
                                {cycle.currentSize.code}
                              </Badge>
                            )}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                            {cycle.currentSgr ? `${cycle.currentSgr.percentage.toFixed(2)}%` : 'N/D'}
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs">
                            <Badge 
                              variant={
                                cycle.state === 'active' 
                                  ? 'default' 
                                  : 'secondary'
                              }
                            >
                              {cycle.state === 'active' 
                                ? 'Attivo' 
                                : isSoldCycle 
                                  ? 'Venduto' 
                                  : 'Chiuso'
                              }
                            </Badge>
                          </td>
                          <td className="px-2 py-1 whitespace-nowrap text-xs font-medium">
                            <div className="flex">
                              <Link href={`/cycles/${cycle.id}`}>
                                <Button variant="ghost" className="h-6 w-6 p-0" title="Visualizza dettagli">
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          {/* Performance Analysis */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Analisi delle Performance dei Cicli</h3>
              
              {/* Target Size Selector */}
              <div className="flex items-center space-x-2">
                <Label htmlFor="target-size" className="text-sm font-medium">Taglia Target:</Label>
                <Select 
                  value={targetSize || ''} 
                  onValueChange={(value) => setTargetSize(value || null)}
                >
                  <SelectTrigger id="target-size" className="w-36">
                    <SelectValue placeholder="Seleziona taglia" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizes
                      .filter(size => parseTagliaCode(size.code) && parseTagliaCode(size.code)! >= 500)
                      .sort((a, b) => {
                        const aValue = parseTagliaCode(a.code) || 0;
                        const bValue = parseTagliaCode(b.code) || 0;
                        return aValue - bValue;
                      })
                      .map((size) => (
                        <SelectItem key={size.id} value={size.code}>
                          <div className="flex items-center">
                            <span 
                              className="w-3 h-3 rounded-full mr-2" 
                              style={{ backgroundColor: getSizeColor(size.code) }}
                            />
                            {size.code}
                          </div>
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Performance Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        ID
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cestello
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FLUPSY
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Taglia Attuale
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SGR (giornaliero)
                      </th>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peso Medio Attuale
                      </th>
                      {targetSize && (
                        <>
                          <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tempo per {targetSize}
                          </th>
                          <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data Stimata
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedFilteredCycles.length === 0 ? (
                      <tr>
                        <td colSpan={targetSize ? 8 : 6} className="px-2 py-4 text-center text-sm text-gray-500">
                          Nessun ciclo trovato
                        </td>
                      </tr>
                    ) : (
                      sortedFilteredCycles
                        .filter(cycle => cycle.state === 'active' && cycle.currentSize && cycle.currentSgr)
                        .map(cycle => {
                          // Dati per il ciclo corrente
                          const basket = baskets.find(b => b.id === cycle.basketId);
                          const flupsy = basket ? flupsys.find(f => f.id === basket.flupsyId) : null;
                          const currentWeight = cycle.currentSize ? estimateAverageWeightFromSize(cycle.currentSize.code) : null;
                          
                          // Calcolo del tempo necessario per raggiungere la taglia target
                          const daysToTarget = targetSize ? calculateDaysToReachTarget(cycle, targetSize) : 0;
                          const targetDateString = calculateTargetDate(cycle, daysToTarget);
                          
                          return (
                            <tr key={`perf-${cycle.id}`} className="hover:bg-gray-50">
                              <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                #{cycle.id}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                {basket?.physicalNumber || cycle.basketId}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                {flupsy?.name || 'N/D'}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs">
                                {cycle.currentSize && (
                                  <Badge 
                                    variant="outline"
                                    style={{ 
                                      backgroundColor: `${getSizeColor(cycle.currentSize.code)}20`,
                                      borderColor: getSizeColor(cycle.currentSize.code),
                                      color: getSizeColor(cycle.currentSize.code) 
                                    }}
                                  >
                                    {cycle.currentSize.code}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                {cycle.currentSgr ? `${cycle.currentSgr.percentage.toFixed(2)}%` : 'N/D'}
                              </td>
                              <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                {currentWeight ? `${currentWeight.toFixed(3)} g` : 'N/D'}
                              </td>
                              {targetSize && (
                                <>
                                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                    {daysToTarget > 0 
                                      ? `${daysToTarget} giorni` 
                                      : daysToTarget === 0 
                                        ? 'Già raggiunta'
                                        : 'N/D'
                                    }
                                  </td>
                                  <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900">
                                    {targetDateString}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}