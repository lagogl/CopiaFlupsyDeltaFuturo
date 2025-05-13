import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSizeNumberFromCode, getSizeDistance, getSizeColor, getSizeBadgeClass } from '@/lib/sizeUtils';
import { Check, Eye } from 'lucide-react';

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
  size: {
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
    // Prima dividiamo i cicli in due gruppi: quelli con la taglia preferita e gli altri
    const matchingCycles = [];
    const otherCycles = [];
    
    for (const cycle of cycles) {
      if (cycle.size?.code === preferredSize) {
        matchingCycles.push(cycle);
      } else {
        otherCycles.push(cycle);
      }
    }
    
    // Ordiniamo gli elementi all'interno di ciascun gruppo
    
    // 1. Gli elementi con taglia preferita ordinati per ID (più recente prima)
    matchingCycles.sort((a, b) => {
      // Se uno è attivo e l'altro no, priorità a quello attivo
      if (a.state !== b.state) {
        if (a.state === 'active' && b.state !== 'active') return -1;
        if (a.state !== 'active' && b.state === 'active') return 1;
      }
      return b.id - a.id;
    });
    
    // 2. Gli altri elementi ordinati per distanza dalla taglia preferita
    otherCycles.sort((a, b) => {
      const aCode = a.size?.code;
      const bCode = b.size?.code;
      
      // Priorità 1: Lo stato attivo
      if (a.state !== b.state) {
        if (a.state === 'active' && b.state !== 'active') return -1;
        if (a.state !== 'active' && b.state === 'active') return 1;
      }

      // Priorità 2: Se entrambi hanno taglie
      if (aCode && bCode) {
        // Ordina per distanza dalla taglia richiesta (più vicina prima)
        const aDistance = getSizeDistance(aCode, preferredSize);
        const bDistance = getSizeDistance(bCode, preferredSize);
        
        if (aDistance !== bDistance) {
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
    
    // Combiniamo i due gruppi, con i cicli della taglia preferita all'inizio
    return [...matchingCycles, ...otherCycles];
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
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                ID
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                Cesta
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                FLUPSY
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Inizio
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Ultima Op.
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-18">
                Taglia
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                N° Animali
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                SGR
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Densità
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Stato
              </th>
              <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCycles && sortedCycles.length > 0 ? (
              sortedCycles.map((cycle) => {
                // Format dates and calculate status
                const startDate = format(new Date(cycle.startDate), 'dd MMM yy', { locale: it });
                
                // Latest operation text
                let latestOpText = 'Nessuna operazione';
                if (cycle.latestOperation) {
                  const opDate = format(new Date(cycle.latestOperation.date), 'dd MMM');
                  const opType = cycle.latestOperation.type.charAt(0).toUpperCase() + 
                                cycle.latestOperation.type.slice(1).replace('-', ' ');
                  latestOpText = `${opType} (${opDate})`;
                }
                
                // Determine status from cycle state
                let statusClass = 'bg-blue-50 text-blue-800 border-blue-200';
                let statusText = 'Attivo';
                
                if (cycle.state !== 'active') {
                  statusClass = 'bg-yellow-50 text-yellow-800 border-yellow-200';
                  statusText = 'Inattivo';
                }
                
                // Dati reali da flupsy e dalla ultima operazione
                const flupsyName = cycle.flupsy?.name || '(Nessun FLUPSY)';
                const animalCount = cycle.lastOperation?.animalCount || 0;
                // TODO: Calcolare la densità reale dal database se necessario
                const density = cycle.lastOperation?.animalsPerKg || 0;
                
                return (
                  <tr 
                    key={cycle.id} 
                    className={`${
                      cycle.size?.code === preferredSize 
                        ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                      #{cycle.id}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      #{cycle.basket?.physicalNumber}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {flupsyName}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {startDate}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 truncate" title={latestOpText}>
                      {latestOpText}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {cycle.size ? (
                        <div className="flex items-center">
                          <span 
                            className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full relative ${
                              cycle.size.code === preferredSize
                                ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm' 
                                : getSizeBadgeClass(cycle.size.code)
                            }`}
                            style={{
                              transition: 'all 0.2s ease-in-out',
                              transform: cycle.size.code === preferredSize ? 'scale(1.05)' : 'scale(1)'
                            }}
                          >
                            {cycle.size.code}
                            {cycle.size.code === preferredSize && (
                              <span className="absolute -top-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
                                <Check className="h-2 w-2 text-white" />
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full bg-gray-100 text-gray-500">
                          N/A
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {animalCount.toLocaleString()}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {cycle.currentSgr ? `${cycle.currentSgr.percentage}%` : 'N/A'}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500">
                      {density} ani/m²
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 inline-flex text-xs leading-4 font-semibold rounded-full border ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs font-medium">
                      <div className="flex space-x-1">
                        <Link href={`/cycles/${cycle.id}`}>
                          <Button variant="ghost" size="xs" className="h-6 w-6 p-0" title="Dettagli">
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </Link>
                        <Link href={`/operations?cycleId=${cycle.id}`}>
                          <Button variant="ghost" size="xs" className="h-6 w-6 p-0" title="Operazione">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5 text-gray-600">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="px-2 py-2 text-center text-gray-500">
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
