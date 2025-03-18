import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Eye, Search, Filter, Pencil, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import OperationForm from '@/components/OperationForm';

export default function Operations() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Query operations
  const { data: operations, isLoading } = useQuery({
    queryKey: ['/api/operations'],
  });

  // Create mutation
  const createOperationMutation = useMutation({
    mutationFn: (newOperation: any) => apiRequest('POST', '/api/operations', newOperation),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Filter operations
  const filteredOperations = operations?.filter(op => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${op.basketId}`.includes(searchTerm) || 
      `${op.cycleId}`.includes(searchTerm);
    
    // Filter by operation type
    const matchesType = typeFilter === 'all' || op.type === typeFilter;
    
    // Filter by date
    const matchesDate = dateFilter === '' || 
      format(new Date(op.date), 'yyyy-MM-dd') === dateFilter;
    
    return matchesSearch && matchesType && matchesDate;
  }) || [];

  const getOperationTypeBadge = (type: string) => {
    let bgColor = 'bg-primary-light/10 text-primary';
    
    switch (type) {
      case 'prima-attivazione':
        bgColor = 'bg-secondary/10 text-secondary';
        break;
      case 'pulizia':
        bgColor = 'bg-info/10 text-info';
        break;
      case 'vagliatura':
        bgColor = 'bg-primary-light/10 text-primary-light';
        break;
      case 'trattamento':
        bgColor = 'bg-warning/10 text-warning';
        break;
      case 'misura':
        bgColor = 'bg-primary-light/10 text-primary';
        break;
      case 'vendita':
      case 'selezione-vendita':
        bgColor = 'bg-success/10 text-success';
        break;
    }
    
    // Format operation type for display
    const displayType = type
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {displayType}
    </span>;
  };

  const getSizeBadge = (size: any) => {
    if (!size) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    let bgColor = 'bg-blue-100 text-blue-800';
    if (size.code.startsWith('T')) {
      bgColor = 'bg-yellow-100 text-yellow-800';
    } else if (size.code.startsWith('M')) {
      bgColor = 'bg-green-100 text-green-800';
    }
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {size.code}
    </span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Registro Operazioni</h2>
        <div className="flex space-x-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Operazione
          </Button>
        </div>
      </div>

      {/* Operations Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Cerca operazioni, ceste..."
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le tipologie</SelectItem>
                <SelectItem value="prima-attivazione">Prima Attivazione</SelectItem>
                <SelectItem value="pulizia">Pulizia</SelectItem>
                <SelectItem value="vagliatura">Vagliatura</SelectItem>
                <SelectItem value="trattamento">Trattamento</SelectItem>
                <SelectItem value="misura">Misura</SelectItem>
                <SelectItem value="vendita">Vendita</SelectItem>
                <SelectItem value="selezione-vendita">Selezione per Vendita</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipologia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cesta
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciclo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taglia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  # Animali
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso (g)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peso Medio (mg)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Caricamento operazioni...
                  </td>
                </tr>
              ) : filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessuna operazione trovata
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => (
                  <tr key={op.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(op.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getOperationTypeBadge(op.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{op.basket?.physicalNumber || op.basketId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      #{op.cycleId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSizeBadge(op.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {op.animalCount ? op.animalCount.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {op.totalWeight ? op.totalWeight.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {op.averageWeight ? Math.round(op.averageWeight) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-5 w-5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-5 w-5 text-gray-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Operation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Registra Nuova Operazione</DialogTitle>
          </DialogHeader>
          <OperationForm 
            onSubmit={(data) => createOperationMutation.mutate(data)} 
            isLoading={createOperationMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
