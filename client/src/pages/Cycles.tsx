import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { getSizeColor } from '@/lib/sizeUtils';
import { Eye, Search, Filter, InfoIcon, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
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

// Definizione dell'interfaccia Operation per tipizzare i dati delle operazioni
interface Operation {
  id: number;
  cycleId: number;
  type: string;
  date: string;
  lotId?: number;
  animalCount?: number;
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
    [filteredCycles, sortConfig]);

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
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          {dateRangeFilter.start ? format(dateRangeFilter.start, 'dd/MM/yyyy') : "Data inizio"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRangeFilter.start || undefined}
                          onSelect={(date) => setDateRangeFilter(prev => ({ ...prev, start: date || null }))}
                          initialFocus
                        />
                        {dateRangeFilter.start && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full" 
                            onClick={() => setDateRangeFilter(prev => ({ ...prev, start: null }))}
                          >
                            Cancella
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          {dateRangeFilter.end ? format(dateRangeFilter.end, 'dd/MM/yyyy') : "Data fine"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRangeFilter.end || undefined}
                          onSelect={(date) => setDateRangeFilter(prev => ({ ...prev, end: date || null }))}
                          initialFocus
                        />
                        {dateRangeFilter.end && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full" 
                            onClick={() => setDateRangeFilter(prev => ({ ...prev, end: null }))}
                          >
                            Cancella
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {/* Pulsanti azione */}
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setFlupsyFilter(null);
                      setTagFilter(null);
                      setLotFilter(null);
                      setDateRangeFilter({ start: null, end: null });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <InfoIcon className="h-4 w-4 mr-1" />
                  Info
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>I cicli vengono creati e chiusi automaticamente tramite le operazioni di "prima-attivazione" e "vendita".</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Cerca per ID ciclo, cesta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="flex space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="closed">Chiusi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
                    {sortConfig.key === 'id' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('basket')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Cesta</span>
                    {sortConfig.key === 'basket' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('flupsy')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Flupsy</span>
                    {sortConfig.key === 'flupsy' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('startDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Inizio</span>
                    {sortConfig.key === 'startDate' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('endDate')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Fine</span>
                    {sortConfig.key === 'endDate' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Giorni
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('size')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Taglia</span>
                    {sortConfig.key === 'size' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lot')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Lotto</span>
                    {sortConfig.key === 'lot' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  N° Animali
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sgr')}
                >
                  <div className="flex items-center space-x-1">
                    <span>SGR</span>
                    {sortConfig.key === 'sgr' ? (
                      sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Stato
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                    Caricamento cicli...
                  </td>
                </tr>
              ) : sortedFilteredCycles.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                    Nessun ciclo trovato
                  </td>
                </tr>
              ) : (
                sortedFilteredCycles.map((cycle) => {
                  // Format dates
                  const startDate = format(new Date(cycle.startDate), 'dd MMM yy', { locale: it });
                  const endDate = cycle.endDate 
                    ? format(new Date(cycle.endDate), 'dd MMM yy', { locale: it }) 
                    : '-';
                  
                  // Calculate duration
                  let duration = '-';
                  if (cycle.state === 'active') {
                    const days = Math.floor((new Date().getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24));
                    duration = `${days}`;
                  } else if (cycle.endDate) {
                    const days = Math.floor((new Date(cycle.endDate).getTime() - new Date(cycle.startDate).getTime()) / (1000 * 60 * 60 * 24));
                    duration = `${days}`;
                  }
                  
                  // Check if this cycle has a vendita operation
                  const isSoldCycle = operations.some(op => op.type === 'vendita' && op.cycleId === cycle.id);
                  
                  // Recupero dei dati dalle API esistenti (non più simulati)
                  // TODO: Nelle API reali, questi dati dovrebbero essere inclusi direttamente nella risposta del ciclo
                  const flupsy = flupsys.find(f => {
                    // Cerca il FLUPSY basato sul ciclo/cestello
                    const basket = baskets.find(b => b.id === cycle.basketId);
                    return basket && basket.flupsyId === f.id;
                  });
                  
                  // Ricerca dell'operazione di prima attivazione per ottenere il lotto
                  const primaAttivazione = operations.find(
                    op => op.cycleId === cycle.id && op.type === 'prima-attivazione'
                  );
                  
                  const lot = primaAttivazione && primaAttivazione.lotId 
                    ? lots.find(l => l.id === primaAttivazione.lotId) 
                    : null;
                    
                  // Info taglia dal ciclo
                  const currentSize = cycle.currentSize 
                    ? sizes.find(s => s.id === cycle.currentSize?.id)?.code 
                    : 'N/A';
                    
                  // Altri dati dalle operazioni più recenti
                  const latestMeasurement = operations.find(
                    op => op.cycleId === cycle.id && (op.type === 'misura' || op.type === 'peso')
                  );
                  
                  const animalCount = latestMeasurement?.animalCount || 0;
                  const sgrValue = cycle.currentSgr ? `${cycle.currentSgr.percentage.toFixed(1)}%` : '-';
                  
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
                          <span className="absolute -right-2 -top-1">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        #{cycle.basket?.physicalNumber || cycle.basketId}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {flupsy ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{flupsy.name}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="text-xs">
                                  <p><strong>Posizione:</strong> {flupsy.location || 'N/A'}</p>
                                  <p><strong>Posizioni max:</strong> {flupsy.maxPositions || 'N/A'}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {startDate}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {endDate}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {duration}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs">
                        {currentSize !== 'N/A' ? (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {currentSize}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-500">
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {lot ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  #{lot.id} {lot.supplier ? `(${lot.supplier})` : ''}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                <div className="text-xs">
                                  <p><strong>Fornitore:</strong> {lot.supplier || 'N/A'}</p>
                                  <p><strong>Data arrivo:</strong> {lot.arrivalDate ? format(new Date(lot.arrivalDate), 'dd/MM/yy') : 'N/A'}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {animalCount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {cycle.currentSgr && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{cycle.currentSgr.percentage.toFixed(1)}%</span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="text-xs">
                                  <p><strong>SGR:</strong> Tasso di crescita specifico</p>
                                  <p><strong>Valore:</strong> {cycle.currentSgr.percentage.toFixed(2)}%</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) || '-'}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        <Badge variant="outline" className={`px-1.5 py-0 text-xs ${
                          cycle.state === 'active' 
                            ? 'bg-blue-50 text-blue-800 border-blue-200' 
                            : isSoldCycle 
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-green-50 text-green-800 border-green-200'
                        }`}>
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
    </div>
  );
}
