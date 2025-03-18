import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Eye, Copy, Download, Plus, Filter, Upload, Pencil, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BasketForm from '@/components/BasketForm';
import NFCReader from '@/components/NFCReader';

export default function Baskets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Query baskets
  const { data: baskets, isLoading } = useQuery({
    queryKey: ['/api/baskets'],
  });

  // Create mutation
  const createBasketMutation = useMutation({
    mutationFn: (newBasket: any) => apiRequest('POST', '/api/baskets', newBasket),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Filter baskets
  const filteredBaskets = baskets?.filter(basket => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${basket.physicalNumber}`.includes(searchTerm) || 
      `${basket.currentCycleId}`.includes(searchTerm);
    
    // Filter by state
    const matchesState = stateFilter === 'all' || 
      (stateFilter === 'active' && basket.state === 'active') ||
      (stateFilter === 'available' && basket.state === 'available');
    
    return matchesSearch && matchesState;
  }) || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Gestione Ceste</h2>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filtra
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Esporta
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Cesta
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Cerca per numero cesta, ciclo..."
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
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato cesta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Con ciclo attivo</SelectItem>
                <SelectItem value="available">Disponibili</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Taglia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le taglie</SelectItem>
                <SelectItem value="T0">T0</SelectItem>
                <SelectItem value="T1">T1</SelectItem>
                <SelectItem value="M1">M1</SelectItem>
                <SelectItem value="M2">M2</SelectItem>
                <SelectItem value="M3">M3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Baskets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    ID Cesta
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciclo Attuale
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stato
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ultima Operazione
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taglia Attuale
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Attivazione
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Caricamento ceste...
                  </td>
                </tr>
              ) : filteredBaskets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessuna cesta trovata
                  </td>
                </tr>
              ) : (
                filteredBaskets.map((basket) => {
                  let statusBadge;
                  if (basket.state === 'active') {
                    statusBadge = <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ciclo attivo</Badge>;
                  } else {
                    statusBadge = <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Disponibile</Badge>;
                  }

                  return (
                    <tr key={basket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{basket.physicalNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                        {basket.currentCycleId ? `#${basket.currentCycleId}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Last operation would come from a query for specific basket */}
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">-</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Activation date would come from a query for specific basket */}
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-5 w-5 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Copy className="h-5 w-5 text-gray-600" />
                          </Button>
                          {basket.state === 'available' ? (
                            <Button variant="ghost" size="icon">
                              <Plus className="h-5 w-5 text-accent-dark" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon">
                              <Download className="h-5 w-5 text-secondary" />
                            </Button>
                          )}
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

      {/* Create Basket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crea Nuova Cesta</DialogTitle>
          </DialogHeader>
          <BasketForm 
            onSubmit={(data) => createBasketMutation.mutate(data)} 
            isLoading={createBasketMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
