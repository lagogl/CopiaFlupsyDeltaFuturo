import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import { Operation } from '@shared/schema';

interface RecentOperationsProps {
  operations: any[];
}

const getOperationColor = (type: string) => {
  switch (type) {
    case 'prima-attivazione':
      return 'border-secondary';
    case 'pulizia':
      return 'border-info';
    case 'vagliatura':
      return 'border-primary-light';
    case 'trattamento':
      return 'border-warning';
    case 'misura':
      return 'border-primary';
    case 'vendita':
    case 'selezione-vendita':
      return 'border-success';
    default:
      return 'border-gray-300';
  }
};

const getOperationStatus = (type: string) => {
  switch (type) {
    case 'prima-attivazione':
      return {
        label: 'Nuovo Ciclo',
        className: 'bg-secondary/10 text-secondary'
      };
    case 'vendita':
    case 'selezione-vendita':
      return {
        label: 'Ciclo Chiuso',
        className: 'bg-success/10 text-success'
      };
    default:
      return {
        label: 'Completata',
        className: 'bg-primary-light/10 text-primary'
      };
  }
};

const formatDate = (date: string) => {
  try {
    const operationDate = new Date(date);
    return formatDistanceToNow(operationDate, { addSuffix: true, locale: it });
  } catch (error) {
    return 'Data sconosciuta';
  }
};

export default function RecentOperations({ operations }: RecentOperationsProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-condensed font-bold text-lg text-gray-800">Operazioni Recenti</h3>
      </div>
      <div className="p-4">
        <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide">
          {operations.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Nessuna operazione recente
            </div>
          ) : (
            operations.map(op => {
              const borderColor = getOperationColor(op.type);
              const status = getOperationStatus(op.type);
              
              return (
                <div key={op.id} className={`border-l-4 ${borderColor} pl-4 py-2`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500">{formatDate(op.date)}</span>
                      <h4 className="font-medium text-gray-800">
                        {op.type.charAt(0).toUpperCase() + op.type.slice(1).replace('-', ' ')}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Cesta #{op.basket?.physicalNumber} (Ciclo #{op.cycleId})
                      </p>
                    </div>
                    <div className={`${status.className} rounded-md px-2 py-1 text-xs font-medium`}>
                      {status.label}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 text-center">
          <Link href="/operations" className="text-primary hover:text-primary-dark text-sm font-medium">
            Visualizza tutte le operazioni →
          </Link>
        </div>
      </div>
    </div>
  );
}
