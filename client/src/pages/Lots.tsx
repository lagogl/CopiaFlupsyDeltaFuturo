import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Eye, Search, Filter, Plus, Package2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import LotForm from '@/components/LotForm';

export default function Lots() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Query lots
  const { data: lots, isLoading } = useQuery({
    queryKey: ['/api/lots'],
  });

  // Create mutation
  const createLotMutation = useMutation({
    mutationFn: (newLot: any) => apiRequest('POST', '/api/lots', newLot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update lot state mutation
  const updateLotStateMutation = useMutation({
    mutationFn: ({ id, state }: { id: number, state: string }) => 
      apiRequest('PATCH', `/api/lots/${id}`, { state }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
    }
  });

  // Filter lots
  const filteredLots = lots?.filter(lot => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${lot.id}`.includes(searchTerm) || 
      lot.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && lot.state === 'active') ||
      (statusFilter === 'exhausted' && lot.state === 'exhausted');
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleToggleLotState = (lot: any) => {
    const newState = lot.state === 'active' ? 'exhausted' : 'active';
    const confirmMessage = newState === 'exhausted' 
      ? 'Sei sicuro di voler segnare questo lotto come esaurito?' 
      : 'Sei sicuro di voler riattivare questo lotto?';
    
    if (confirm(confirmMessage)) {
      updateLotStateMutation.mutate({ 
        id: lot.id, 
        state: newState
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Gestione Lotti</h2>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filtra
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo Lotto
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
                placeholder="Cerca per ID, fornitore..."
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
                <SelectValue placeholder="Stato lotto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="exhausted">Esauriti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Lots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Lotto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Arrivo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fornitore
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qualità
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
                  Stato
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
                    Caricamento lotti...
                  </td>
                </tr>
              ) : filteredLots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessun lotto trovato
                  </td>
                </tr>
              ) : (
                filteredLots.map((lot) => {
                  // Format date
                  const arrivalDate = format(new Date(lot.arrivalDate), 'dd MMM yyyy', { locale: it });
                  
                  return (
                    <tr key={lot.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{lot.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {arrivalDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lot.supplier}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lot.quality || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-blue-100 text-blue-800">
                          {lot.size ? lot.size.code : '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lot.animalCount ? lot.animalCount.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lot.weight ? lot.weight.toLocaleString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={`${
                          lot.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lot.state === 'active' ? 'Attivo' : 'Esaurito'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" title="Visualizza dettagli">
                            <Eye className="h-5 w-5 text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={lot.state === 'active' ? 'Segna come esaurito' : 'Riattiva lotto'}
                            onClick={() => handleToggleLotState(lot)}>
                            <Package2 className={`h-5 w-5 ${lot.state === 'active' ? 'text-warning' : 'text-success'}`} />
                          </Button>
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

      {/* Create Lot Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Lotto</DialogTitle>
          </DialogHeader>
          <LotForm 
            onSubmit={(data) => createLotMutation.mutate(data)} 
            isLoading={createLotMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
