import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import SizeForm from '@/components/SizeForm';

export default function Sizes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<any>(null);
  
  // Query sizes
  const { data: sizes, isLoading } = useQuery({
    queryKey: ['/api/sizes'],
  });

  // Create mutation
  const createSizeMutation = useMutation({
    mutationFn: (newSize: any) => apiRequest('POST', '/api/sizes', newSize),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sizes'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update mutation
  const updateSizeMutation = useMutation({
    mutationFn: (size: any) => apiRequest('PATCH', `/api/sizes/${size.id}`, size),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sizes'] });
      setEditingSize(null);
    }
  });

  // Filter sizes
  const filteredSizes = sizes?.filter(size => {
    return searchTerm === '' || 
      size.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      size.name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Tabella Taglie</h2>
        <div className="flex space-x-3">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Taglia
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
                placeholder="Cerca per codice o nome..."
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

      {/* Sizes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Misura (mm)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Animali/Kg
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Animali/Kg
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Note
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
                    Caricamento taglie...
                  </td>
                </tr>
              ) : filteredSizes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessuna taglia trovata
                  </td>
                </tr>
              ) : (
                filteredSizes.map((size) => {
                  // Determine badge color based on size code
                  let badgeColor = 'bg-blue-100 text-blue-800';
                  if (size.code.startsWith('T')) {
                    badgeColor = 'bg-yellow-100 text-yellow-800';
                  } else if (size.code.startsWith('M')) {
                    badgeColor = 'bg-green-100 text-green-800';
                  }
                  
                  return (
                    <tr key={size.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={badgeColor}>
                          {size.code}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.sizeMm}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.minAnimalsPerKg}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.maxAnimalsPerKg}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {size.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingSize(size)}>
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

      {/* Create Size Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crea Nuova Taglia</DialogTitle>
          </DialogHeader>
          <SizeForm 
            onSubmit={(data) => createSizeMutation.mutate(data)} 
            isLoading={createSizeMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Size Dialog */}
      <Dialog 
        open={editingSize !== null} 
        onOpenChange={(open) => !open && setEditingSize(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Taglia</DialogTitle>
          </DialogHeader>
          {editingSize && (
            <SizeForm 
              defaultValues={editingSize}
              onSubmit={(data) => updateSizeMutation.mutate({ id: editingSize.id, ...data })} 
              isLoading={updateSizeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
