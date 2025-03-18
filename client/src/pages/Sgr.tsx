import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SgrForm from '@/components/SgrForm';

export default function Sgr() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSgr, setEditingSgr] = useState<any>(null);
  
  // Query SGRs
  const { data: sgrs, isLoading } = useQuery({
    queryKey: ['/api/sgr'],
  });

  // Create mutation
  const createSgrMutation = useMutation({
    mutationFn: (newSgr: any) => apiRequest('POST', '/api/sgr', newSgr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update mutation
  const updateSgrMutation = useMutation({
    mutationFn: (sgr: any) => apiRequest('PATCH', `/api/sgr/${sgr.id}`, sgr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setEditingSgr(null);
    }
  });

  // Filter SGRs
  const filteredSgrs = sgrs?.filter(sgr => {
    return searchTerm === '' || 
      sgr.month.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Sort SGRs by month order (Italian months)
  const monthOrder = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  
  const sortedSgrs = [...(filteredSgrs || [])].sort((a, b) => {
    const monthA = a.month.toLowerCase();
    const monthB = b.month.toLowerCase();
    return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Indici SGR</h2>
        <div className="flex space-x-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuovo SGR
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Input
                type="text"
                placeholder="Cerca per mese..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SGR Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mese
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentuale (%)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Caricamento indici SGR...
                  </td>
                </tr>
              ) : sortedSgrs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessun indice SGR trovato
                  </td>
                </tr>
              ) : (
                sortedSgrs.map((sgr) => {
                  // Capitalize month name
                  const displayMonth = sgr.month.charAt(0).toUpperCase() + sgr.month.slice(1);
                  
                  return (
                    <tr key={sgr.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {displayMonth}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sgr.percentage}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingSgr(sgr)}>
                          <Pencil className="h-5 w-5 text-gray-600" />
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

      {/* Create SGR Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Indice SGR</DialogTitle>
          </DialogHeader>
          <SgrForm 
            onSubmit={(data) => createSgrMutation.mutate(data)} 
            isLoading={createSgrMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit SGR Dialog */}
      <Dialog 
        open={editingSgr !== null} 
        onOpenChange={(open) => !open && setEditingSgr(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Indice SGR</DialogTitle>
          </DialogHeader>
          {editingSgr && (
            <SgrForm 
              defaultValues={editingSgr}
              onSubmit={(data) => updateSgrMutation.mutate({ id: editingSgr.id, ...data })} 
              isLoading={updateSgrMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
