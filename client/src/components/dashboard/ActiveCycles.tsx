import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSizeNumberFromCode, getSizeDistance, getSizeColor, getSizeBadgeClass } from '@/lib/sizeUtils';
import { Check } from 'lucide-react';

interface Cycle {
  id: number;
  startDate: string;
  endDate: string | null;
  basket: {
    id: number;
    physicalNumber: number;
  };
  latestOperation: {
    id: number;
    date: string;
    type: string;
  } | null;
  currentSize: {
    id: number;
    code: string;
    name: string;
  } | null;
  currentSgr: {
    id: number;
    percentage: number;
  } | null;
  state: string;
}

interface ActiveCyclesProps {
  activeCycles: any[];
}

export default function ActiveCycles({ activeCycles }: ActiveCyclesProps) {
  // Stato locale per la taglia preferita
  const [preferredSize, setPreferredSize] = useState<string>(() => {
    return localStorage.getItem('preferredSizeCode') || 'TP-500';
  });

  // Query for active cycles with more details
  const { data: detailedCycles, isLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles/active-with-details'],
  });

  // Salva la taglia preferita in localStorage
  useEffect(() => {
    localStorage.setItem('preferredSizeCode', preferredSize);
  }, [preferredSize]);

  // Definisci la funzione di ordinamento
  const sortCyclesBySize = useCallback((cycles: Cycle[]) => {
    const sorted = [...cycles].sort((a, b) => {
      const aCode = a.currentSize?.code;
      const bCode = b.currentSize?.code;
      
      // Priorità 1: Lo stato attivo
      if (a.state !== b.state) {
        if (a.state === 'active' && b.state !== 'active') return -1;
        if (a.state !== 'active' && b.state === 'active') return 1;
      }

      // Priorità 2: Se entrambi hanno taglie
      if (aCode && bCode) {
        // Prima priorità: la taglia esatta richiesta
        const aHasExactMatch = aCode === preferredSize;
        const bHasExactMatch = bCode === preferredSize;
        
        if (aHasExactMatch && !bHasExactMatch) return -1;
        if (!aHasExactMatch && bHasExactMatch) return 1;
        
        // Seconda priorità: somiglianza alla taglia target
        const aDistance = getSizeDistance(aCode, preferredSize);
        const bDistance = getSizeDistance(bCode, preferredSize);
        
        if (aDistance !== bDistance) {
          // Ordina per distanza dalla taglia richiesta (più vicina prima)
          return aDistance - bDistance;
        }
        
        // Se le distanze sono uguali, ordina numericamente per valore assoluto della taglia
        const aValue = getSizeNumberFromCode(aCode);
        const bValue = getSizeNumberFromCode(bCode);
        return aValue - bValue;
      }
      
      // Priorità 3: Cicli con taglia vengono prima di quelli senza taglia
      if (aCode && !bCode) return -1;
      if (!aCode && bCode) return 1;
      
      // Priorità 4: Se entrambi non hanno taglia, ordina per ID (più recente prima)
      return b.id - a.id;
    });
    
    return sorted;
  }, [preferredSize]);

  // Memorizza l'array ordinato
  const sortedCycles = useMemo(() => {
    if (!detailedCycles) return [];
    return sortCyclesBySize(detailedCycles);
  }, [detailedCycles, sortCyclesBySize, preferredSize]);

  if (isLoading) {
    return (
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-condensed font-bold text-lg text-gray-800">Cicli Produttivi Attivi</h3>
        </div>
        <div className="p-8 text-center">
          <p>Caricamento cicli attivi...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-condensed font-bold text-lg text-gray-800">Cicli Produttivi Attivi</h3>
        <div className="flex items-center space-x-2">
          <label htmlFor="size-select" className="text-sm text-gray-500">Taglia preferita:</label>
          <Select value={preferredSize} onValueChange={(size) => {
            setPreferredSize(size);
          }}>
            <SelectTrigger className="w-[150px]" id="size-select">
              <div className="flex items-center">
                <div 
                  className="h-3 w-3 mr-2 rounded-full" 
                  style={{backgroundColor: getSizeColor(preferredSize)}}
                ></div>
                <SelectValue placeholder="Taglia preferita" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TP-180">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-180')}}></div>
                  <span>Taglia TP-180</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-200">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-200')}}></div>
                  <span>Taglia TP-200</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-315">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-315')}}></div>
                  <span>Taglia TP-315</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-450">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-450')}}></div>
                  <span>Taglia TP-450</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-500">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-500')}}></div>
                  <span>Taglia TP-500</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-600">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-600')}}></div>
                  <span>Taglia TP-600</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-700">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-700')}}></div>
                  <span>Taglia TP-700</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-800">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-800')}}></div>
                  <span>Taglia TP-800</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-1000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-1000')}}></div>
                  <span>Taglia TP-1000</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-1500">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-1500')}}></div>
                  <span>Taglia TP-1500</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-2000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-2000')}}></div>
                  <span>Taglia TP-2000</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-3000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-3000')}}></div>
                  <span>Taglia TP-3000</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-5000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-5000')}}></div>
                  <span>Taglia TP-5000</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-8000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-8000')}}></div>
                  <span>Taglia TP-8000</span>
                </div>
              </SelectItem>
              <SelectItem value="TP-10000">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-10000')}}></div>
                  <span>Taglia TP-10000</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID Ciclo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cesta
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data Inizio
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ultima Operazione
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Taglia Attuale
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SGR
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCycles && sortedCycles.length > 0 ? (
              sortedCycles.map((cycle) => {
                // Format dates and calculate status
                const startDate = format(new Date(cycle.startDate), 'dd MMM yyyy', { locale: it });
                
                // Latest operation text
                let latestOpText = 'Nessuna operazione';
                if (cycle.latestOperation) {
                  const opDate = format(new Date(cycle.latestOperation.date), 'dd MMM');
                  const opType = cycle.latestOperation.type.charAt(0).toUpperCase() + 
                                cycle.latestOperation.type.slice(1).replace('-', ' ');
                  latestOpText = `${opType} (${opDate})`;
                }
                
                // Determine inactive status
                let statusClass = 'bg-blue-100 text-blue-800';
                let statusText = 'Attivo';
                
                // For demo, mark some cycles as inactive based on their id
                if (cycle.id % 4 === 0) {
                  statusClass = 'bg-yellow-100 text-yellow-800';
                  statusText = 'Inattivo (7g)';
                }
                
                return (
                  <tr key={cycle.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{cycle.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Cesta #{cycle.basket?.physicalNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {startDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {latestOpText}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cycle.currentSize ? (
                        <div className="flex items-center gap-1">
                          <span 
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full relative ${
                              cycle.currentSize.code === preferredSize
                                ? 'bg-blue-100 text-blue-800 border-2 border-blue-500 shadow-md' 
                                : getSizeBadgeClass(cycle.currentSize.code)
                            }`}
                            style={{
                              transition: 'all 0.2s ease-in-out',
                              transform: cycle.currentSize.code === preferredSize ? 'scale(1.1)' : 'scale(1)'
                            }}
                          >
                            {cycle.currentSize.code}
                            {cycle.currentSize.code === preferredSize && (
                              <span className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-0.5">
                                <Check className="h-3 w-3 text-white" />
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {cycle.currentSgr ? `${cycle.currentSgr.percentage}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/cycles/${cycle.id}`} className="text-primary hover:text-primary-dark mr-3">
                        Dettagli
                      </Link>
                      <Link href={`/operations?cycleId=${cycle.id}`} className="text-gray-600 hover:text-gray-900">
                        Operazione
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                  Nessun ciclo attivo trovato
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 text-center">
        <Link href="/cycles" className="text-primary hover:text-primary-dark text-sm font-medium">
          Visualizza tutti i cicli →
        </Link>
      </div>
    </div>
  );
}
