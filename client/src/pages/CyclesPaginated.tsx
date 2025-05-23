import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getSizeColor, getSizeBadgeStyle } from '@/lib/sizeUtils';
import { Eye, Search, Filter, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

// Definizione delle interfacce
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

interface Size {
  id: number;
  code: string;
  name: string;
  min_animals_per_kg?: number;
  max_animals_per_kg?: number;
}

interface SGR {
  id: number;
  percentage: number;
}

interface Lot {
  id: number;
  supplier: string;
  arrivalDate: string;
}

interface Flupsy {
  id: number;
  name: string;
  location?: string;
  maxPositions?: number;
}

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
}

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

export default function CyclesPaginated() {
  // State per filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [lotFilter, setLotFilter] = useState<number | null>(null);
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  
  // State per paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // State per ordinamento
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({
    key: 'id',
    direction: 'descending'
  });
  
  // Integrazione con filtri dashboard
  const [dashboardFilters] = useFilterPersistence('dashboard', {
    selectedCenter: '',
    selectedFlupsyIds: [] as number[]
  });
  
  // Filtro FLUPSY locale che può essere inizializzato dai filtri dashboard
  const [flupsyFilter, setFlupsyFilter] = useState<number | null>(null);
  
  // Query per i dati necessari
  const { data: allCycles = [], isLoading: isAllCyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles', 'all'],
    queryFn: () => fetch('/api/cycles?includeAll=true').then(res => res.json()),
  });
  
  const { data: operations = [] } = useQuery<Operation[]>({
    queryKey: ['/api/operations?includeAll=true'],
  });
  
  const { data: flupsys = [] } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  const { data: baskets = [] } = useQuery<Basket[]>({
    queryKey: ['/api/baskets?includeAll=true'],
  });
  
  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ['/api/lots?includeAll=true'],
  });
  
  const { data: sizes = [] } = useQuery<Size[]>({
    queryKey: ['/api/sizes'],
  });
  
  // Inizializza il filtro FLUPSY dalla dashboard quando i dati sono pronti
  useEffect(() => {
    if (flupsys.length > 0 && !flupsyFilter) {
      const dashboardSelectedFlupsys = dashboardFilters.selectedFlupsyIds as number[];
      if (dashboardSelectedFlupsys && dashboardSelectedFlupsys.length > 0) {
        setFlupsyFilter(dashboardSelectedFlupsys[0]);
      }
    }
  }, [flupsys, dashboardFilters, flupsyFilter]);
  
  // Calcola la taglia in base al peso e al numero di animali (come nella dashboard)
  const calculateDisplaySize = (cycle: Cycle) => {
    // Trova le operazioni di peso per questo ciclo
    const weightOperations = operations
      .filter(op => op.cycleId === cycle.id && op.type === 'peso')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Se non ci sono operazioni di peso, usa la taglia corrente del ciclo
    if (weightOperations.length === 0) {
      return cycle.currentSize?.code || 'N/D';
    }
    
    // Usa l'ultima operazione di peso
    const lastOp = weightOperations[0];
    if (!lastOp.totalWeight || !lastOp.animalCount) return cycle.currentSize?.code || 'N/D';
    
    // Calcola il peso medio in grammi
    const avgWeight = (lastOp.totalWeight * 1000) / lastOp.animalCount;
    
    // Trova la taglia appropriata in base al peso medio
    const size = sizes.find(s => {
      if (!s.min_animals_per_kg || !s.max_animals_per_kg) return false;
      const minWeight = 1000 / s.max_animals_per_kg; // peso minimo in grammi
      const maxWeight = 1000 / s.min_animals_per_kg; // peso massimo in grammi
      return avgWeight >= minWeight && avgWeight < maxWeight;
    });
    
    return size?.code || cycle.currentSize?.code || 'N/D';
  };
  
  // Filtra i cicli in base ai criteri
  const filteredCycles = useMemo(() => {
    if (isAllCyclesLoading) return [];
    
    return allCycles.filter(cycle => {
      // Filtro per stato
      if (statusFilter !== 'all' && cycle.state !== statusFilter) {
        return false;
      }
      
      // Filtro per FLUPSY
      if (flupsyFilter) {
        const basket = baskets.find(b => b.id === cycle.basketId);
        if (!basket || basket.flupsyId !== flupsyFilter) {
          return false;
        }
      }
      
      // Filtro per ricerca testuale
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const cycleId = String(cycle.id).toLowerCase();
        const basketId = String(cycle.basketId).toLowerCase();
        
        if (!cycleId.includes(lowerSearch) && !basketId.includes(lowerSearch)) {
          return false;
        }
      }
      
      // Filtro per taglia
      if (tagFilter) {
        if (!cycle.currentSize || cycle.currentSize.code !== tagFilter) {
          return false;
        }
      }
      
      // Filtro per lotto
      if (lotFilter) {
        const firstOp = operations.find(op => 
          op.cycleId === cycle.id && op.type === 'prima-attivazione');
          
        if (!firstOp || firstOp.lotId !== lotFilter) {
          return false;  
        }
      }
      
      // Filtro per date
      if (dateRangeFilter.start || dateRangeFilter.end) {
        const cycleDate = new Date(cycle.startDate);
        
        if (dateRangeFilter.start && cycleDate < dateRangeFilter.start) {
          return false;
        }
        
        if (dateRangeFilter.end) {
          const endDate = new Date(dateRangeFilter.end);
          endDate.setHours(23, 59, 59, 999);
          if (cycleDate > endDate) {
            return false;
          }
        }
      }
      
      return true;
    });
  }, [
    allCycles, 
    isAllCyclesLoading, 
    statusFilter, 
    flupsyFilter, 
    searchTerm, 
    tagFilter, 
    lotFilter, 
    dateRangeFilter,
    baskets,
    operations
  ]);
  
  // Ordina i cicli filtrati
  const sortedCycles = useMemo(() => {
    return [...filteredCycles].sort((a, b) => {
      let aValue, bValue;
      
      // Determina i valori da confrontare in base al campo di ordinamento
      switch(sortConfig.key) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'basket':
          aValue = a.basket?.physicalNumber || 0;
          bValue = b.basket?.physicalNumber || 0;
          break;
        case 'flupsy':
          // Correttamente trova i cestelli e i FLUPSY correlati
          const basketA = baskets.find(basket => basket.id === a.basketId);
          const flupsyA = basketA ? flupsys.find(f => f.id === basketA.flupsyId)?.name || '' : '';
          
          const basketB = baskets.find(basket => basket.id === b.basketId);
          const flupsyB = basketB ? flupsys.find(f => f.id === basketB.flupsyId)?.name || '' : '';
          
          aValue = flupsyA.toLowerCase();
          bValue = flupsyB.toLowerCase();
          break;
        case 'startDate':
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case 'endDate':
          if (a.endDate && b.endDate) {
            aValue = new Date(a.endDate).getTime();
            bValue = new Date(b.endDate).getTime();
          } else if (a.endDate) {
            aValue = new Date(a.endDate).getTime();
            bValue = Infinity;
          } else if (b.endDate) {
            aValue = Infinity;
            bValue = new Date(b.endDate).getTime();
          } else {
            aValue = 0;
            bValue = 0;
          }
          break;
        case 'size':
          aValue = a.currentSize?.code || '';
          bValue = b.currentSize?.code || '';
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      // Determina la direzione di ordinamento
      if (sortConfig.direction === 'ascending') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredCycles, sortConfig, baskets, flupsys]);
  
  // Calcola i cicli da mostrare nella pagina corrente
  const paginatedCycles = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return sortedCycles.slice(startIdx, endIdx);
  }, [sortedCycles, currentPage, pageSize]);
  
  // Totale dei cicli filtrati e pagine
  const totalCycles = filteredCycles.length;
  const totalPages = Math.ceil(totalCycles / pageSize);
  
  // Reset alla prima pagina quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, tagFilter, flupsyFilter, lotFilter, dateRangeFilter]);
  
  // Funzione per cambiare ordinamento
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        // Inverte la direzione se la colonna è già ordinata
        return {
          ...prev,
          direction: prev.direction === 'ascending' ? 'descending' : 'ascending'
        };
      }
      // Imposta una nuova colonna di ordinamento
      return {
        key,
        direction: 'ascending'
      };
    });
  };
  
  // Funzione per ottenere l'icona di ordinamento corretta
  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    
    return sortConfig.direction === 'ascending' 
      ? <ArrowUp className="h-4 w-4" /> 
      : <ArrowDown className="h-4 w-4" />;
  };
  
  // Genera range di paginazione
  const getPaginationRange = () => {
    const maxPagesToShow = 5;
    const range = [];
    
    if (totalPages <= maxPagesToShow) {
      // Mostra tutte le pagine se sono poche
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Mostra un intervallo limitato centrato sulla pagina corrente
      const leftOffset = Math.floor(maxPagesToShow / 2);
      const rightOffset = Math.ceil(maxPagesToShow / 2) - 1;
      
      let startPage = Math.max(1, currentPage - leftOffset);
      let endPage = Math.min(totalPages, currentPage + rightOffset);
      
      // Aggiusta se siamo all'inizio o alla fine
      if (startPage === 1) {
        endPage = Math.min(maxPagesToShow, totalPages);
      }
      
      if (endPage === totalPages) {
        startPage = Math.max(1, totalPages - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        range.push(i);
      }
    }
    
    return range;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cicli Produttivi</h1>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Filtri */}
      <div className="p-4 mb-4 bg-slate-50 rounded-lg border">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro ricerca */}
          <div className="relative w-full md:w-auto flex-grow">
            <Input
              placeholder="Cerca ciclo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Filtro stato */}
          <div className="w-full md:w-auto">
            <Select 
              value={statusFilter} 
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="closed">Chiusi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro FLUPSY */}
          <div className="w-full md:w-auto">
            <Select 
              value={flupsyFilter?.toString() || ''}
              onValueChange={(value) => setFlupsyFilter(value ? parseInt(value, 10) : null)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="FLUPSY" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Tutti i FLUPSY</SelectItem>
                {flupsys.map(flupsy => (
                  <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                    {flupsy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro taglia */}
          <div className="w-full md:w-auto">
            <Select 
              value={tagFilter || ''} 
              onValueChange={(value) => setTagFilter(value || null)}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Taglia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le taglie</SelectItem>
                {sizes.map((size) => (
                  <SelectItem key={size.id} value={size.code}>
                    <div className="flex items-center">
                      <span 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getSizeColor(size.code) }}
                      />
                      {size.code} - {size.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro lotto */}
          <div className="w-full md:w-auto">
            <Select 
              value={lotFilter?.toString() || ''} 
              onValueChange={(value) => setLotFilter(value ? parseInt(value, 10) : null)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Lotto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Tutti i lotti</SelectItem>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id.toString()}>
                    {lot.supplier} - {format(new Date(lot.arrivalDate), 'dd/MM/yyyy', { locale: it })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Intervallo date</h4>
                  <div className="grid gap-2">
                    <div className="grid gap-1">
                      <div className="flex items-center">
                        <Label htmlFor="date-from">Da</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto"
                          onClick={() => setDateRangeFilter(prev => ({ ...prev, start: null }))}
                        >
                          Reset
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={dateRangeFilter.start || undefined}
                        onSelect={(date: Date | undefined) => 
                          setDateRangeFilter(prev => ({ 
                            ...prev, 
                            start: date || null
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <div className="flex items-center">
                        <Label htmlFor="date-to">A</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto"
                          onClick={() => setDateRangeFilter(prev => ({ ...prev, end: null }))}
                        >
                          Reset
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={dateRangeFilter.end || undefined}
                        onSelect={(date: Date | undefined) => 
                          setDateRangeFilter(prev => ({ 
                            ...prev, 
                            end: date || null
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Mostra stato dei filtri applicati */}
      <div className="flex flex-wrap gap-2 mb-4">
        {searchTerm && (
          <Badge variant="secondary" className="gap-1">
            Ricerca: {searchTerm}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setSearchTerm('')}
            >
              ×
            </Button>
          </Badge>
        )}
        
        {statusFilter !== 'all' && (
          <Badge variant="secondary" className="gap-1">
            Stato: {statusFilter === 'active' ? 'Attivo' : 'Chiuso'}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setStatusFilter('all')}
            >
              ×
            </Button>
          </Badge>
        )}
        
        {flupsyFilter && (
          <Badge variant="secondary" className="gap-1">
            FLUPSY: {flupsys.find(f => f.id === flupsyFilter)?.name || flupsyFilter}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setFlupsyFilter(null)}
            >
              ×
            </Button>
          </Badge>
        )}
        
        {tagFilter && (
          <Badge variant="secondary" className="gap-1">
            <span 
              className="w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: getSizeColor(tagFilter) }}
            />
            Taglia: {tagFilter}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setTagFilter(null)}
            >
              ×
            </Button>
          </Badge>
        )}
        
        {lotFilter && (
          <Badge variant="secondary" className="gap-1">
            Lotto: {lots.find(l => l.id === lotFilter)?.supplier || lotFilter}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setLotFilter(null)}
            >
              ×
            </Button>
          </Badge>
        )}
        
        {(dateRangeFilter.start || dateRangeFilter.end) && (
          <Badge variant="secondary" className="gap-1">
            Date: 
            {dateRangeFilter.start && format(dateRangeFilter.start, 'dd/MM/yyyy', { locale: it })}
            {dateRangeFilter.start && dateRangeFilter.end && ' - '}
            {dateRangeFilter.end && format(dateRangeFilter.end, 'dd/MM/yyyy', { locale: it })}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 ml-1" 
              onClick={() => setDateRangeFilter({ start: null, end: null })}
            >
              ×
            </Button>
          </Badge>
        )}
      </div>
      
      {/* Tabella cicli */}
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-slate-100">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('id')}
                  >
                    ID {getSortIcon('id')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('basket')}
                  >
                    Cestello {getSortIcon('basket')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('flupsy')}
                  >
                    FLUPSY {getSortIcon('flupsy')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('lot')}
                  >
                    Lotto {getSortIcon('lot')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('startDate')}
                  >
                    Data Inizio {getSortIcon('startDate')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('endDate')}
                  >
                    Data Fine {getSortIcon('endDate')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  Stato
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  <button 
                    className="flex items-center gap-1"
                    onClick={() => handleSort('size')}
                  >
                    Taglia {getSortIcon('size')}
                  </button>
                </th>
                <th className="h-10 px-3 text-left align-middle font-medium text-xs uppercase tracking-wider">
                  SGR
                </th>
                <th className="h-10 px-3 text-right align-middle font-medium text-xs uppercase tracking-wider">
                  Nr. Animali
                </th>
                <th className="h-10 px-3 text-center align-middle font-medium text-xs uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {isAllCyclesLoading ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center">
                    Caricamento cicli...
                  </td>
                </tr>
              ) : paginatedCycles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center">
                    Nessun ciclo trovato
                  </td>
                </tr>
              ) : (
                paginatedCycles.map((cycle) => {
                  // Trova il cestello associato al ciclo
                  const basket = baskets.find(b => b.id === cycle.basketId);
                  // Trova il FLUPSY associato al cestello
                  const flupsy = basket ? flupsys.find(f => f.id === basket.flupsyId) : null;
                  
                  // Trova le operazioni di questo ciclo
                  const cycleOperations = operations.filter(op => op.cycleId === cycle.id);
                  
                  // Trova l'ultima operazione di peso per ottenere il numero di animali
                  const lastWeightOp = cycleOperations
                    .filter(op => op.type === 'peso')
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                  
                  // Trova il lotto associato alle operazioni - prima cerca nelle operazioni di prima attivazione
                  const activationOp = cycleOperations.find(op => op.type === 'prima-attivazione');
                  const lotId = activationOp?.lotId || cycleOperations.find(op => op.lotId)?.lotId;
                  const lot = lotId ? lots.find(l => l.id === lotId) : null;
                  
                  // Verifica se il cestello esiste e ha physicalNumber
                  const physicalNumber = basket?.physicalNumber;
                  
                  return (
                    <tr 
                      key={cycle.id}
                      className={`border-b transition-colors hover:bg-muted/50 ${cycle.state === 'closed' ? 'bg-red-50' : ''}`}
                    >
                      <td className="py-2 px-3 align-middle">{cycle.id}</td>
                      <td className="py-2 px-3 align-middle font-medium">
                        #{physicalNumber || 'N/D'}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {flupsy?.name || 'N/D'}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {lot ? lot.supplier : 'N/D'}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {format(new Date(cycle.startDate), 'dd/MM/yyyy', { locale: it })}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {cycle.endDate 
                          ? format(new Date(cycle.endDate), 'dd/MM/yyyy', { locale: it })
                          : '-'
                        }
                      </td>
                      <td className="py-2 px-3 align-middle">
                        <Badge 
                          variant={cycle.state === 'active' ? 'default' : 'outline'}
                          className={cycle.state === 'active' 
                            ? 'bg-blue-900 text-white hover:bg-blue-800' 
                            : 'bg-transparent border border-red-600 text-red-600'}
                        >
                          {cycle.state === 'active' ? 'Attivo' : 'Chiuso'}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {(() => {
                          // Calcola la taglia corretta usando il metodo della dashboard
                          const displaySize = calculateDisplaySize(cycle);
                          if (!displaySize || displaySize === 'N/D') return '-';
                          
                          // Trova la taglia per ottenere il nome completo
                          const size = sizes.find(s => s.code === displaySize);
                          
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className="gap-1"
                                    style={{ 
                                      backgroundColor: `${getSizeColor(displaySize)}20`,
                                      borderColor: getSizeColor(displaySize),
                                      color: getSizeColor(displaySize)
                                    }}
                                  >
                                    {displaySize}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{size?.name || displaySize}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3 align-middle">
                        {cycle.currentSgr ? (
                          `${cycle.currentSgr.percentage.toFixed(2)}%`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 align-middle text-right">
                        {lastWeightOp?.animalCount ? 
                          new Intl.NumberFormat('it-IT').format(lastWeightOp.animalCount) 
                          : '-'}
                      </td>
                      <td className="py-2 px-3 align-middle text-center">
                        <Button 
                          size="sm"
                          variant="ghost" 
                          className="p-0 h-8 w-8" 
                          asChild
                        >
                          <Link href={`/cycles/${cycle.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginazione */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          {totalCycles > 0 
            ? `Mostrando ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, totalCycles)} di ${totalCycles} cicli`
            : 'Nessun ciclo trovato'
          }
        </div>
        
        <div className="flex items-center gap-2">
          {/* Selezione dimensione pagina */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostra</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(value) => {
                setPageSize(parseInt(value, 10));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Controlli paginazione */}
          {totalPages > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {getPaginationRange().map(page => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}