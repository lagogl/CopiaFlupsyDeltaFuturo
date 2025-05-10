import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Eye, Search, Filter, InfoIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'wouter';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
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
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Cicli Produttivi</h2>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filtra
          </Button>
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
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  ID
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Cesta
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Flupsy
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Inizio
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Fine
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Giorni
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Taglia
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Lotto
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  N° Animali
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  SGR
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
              ) : filteredCycles.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-2 py-2 whitespace-nowrap text-center text-gray-500">
                    Nessun ciclo trovato
                  </td>
                </tr>
              ) : (
                filteredCycles.map((cycle) => {
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
                        {flupsy ? flupsy.name : '-'}
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
                        #{lotNumber}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {animalCount.toLocaleString()}
                      </td>
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                        {sgrValue}
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
