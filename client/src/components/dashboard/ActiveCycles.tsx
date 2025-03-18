import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ActiveCyclesProps {
  activeCycles: any[];
}

export default function ActiveCycles({ activeCycles }: ActiveCyclesProps) {
  // Query for active cycles with more details
  const { data: detailedCycles, isLoading } = useQuery({
    queryKey: ['/api/cycles/active'],
  });

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
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-condensed font-bold text-lg text-gray-800">Cicli Produttivi Attivi</h3>
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
            {detailedCycles && detailedCycles.length > 0 ? (
              detailedCycles.map((cycle) => {
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
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cycle.currentSize ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {cycle.currentSize ? cycle.currentSize.code : 'N/A'}
                      </span>
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
