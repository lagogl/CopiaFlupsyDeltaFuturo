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
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'code',
    direction: 'asc'
  });

  // Function to extract numeric value from size code (e.g., 'TP-500' → 500)
  const getSizeNumber = (sizeCode: string): number => {
    if (!sizeCode || !sizeCode.startsWith('TP-')) return 0;
    return parseInt(sizeCode.replace('TP-', '')) || 0;
  };

  // Sort function
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Query sizes
  const { data: sizes, isLoading } = useQuery({
    queryKey: ['/api/sizes'],
  });

  // Create mutation
  const createSizeMutation = useMutation({
    mutationFn: (newSize: any) => apiRequest({
      url: '/api/sizes',
      method: 'POST',
      body: newSize
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sizes'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update mutation
  const updateSizeMutation = useMutation({
    mutationFn: (size: any) => apiRequest({
      url: `/api/sizes/${size.id}`,
      method: 'PATCH',
      body: size
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sizes'] });
      setEditingSize(null);
    }
  });

  // Filter and sort sizes
  const filteredAndSortedSizes = (() => {
    // First filter
    const filtered = (sizes as any[])?.filter((size: any) => {
      return searchTerm === '' || 
        size.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
        size.name.toLowerCase().includes(searchTerm.toLowerCase());
    }) || [];

    // Then sort
    const sorted = [...filtered].sort((a: any, b: any) => {
      if (sortConfig.key === 'code') {
        // Numeric sorting for size codes (TP-100 < TP-10000)
        const numA = getSizeNumber(a.code);
        const numB = getSizeNumber(b.code);
        
        if (sortConfig.direction === 'asc') {
          return numA - numB;
        } else {
          return numB - numA;
        }
      } else {
        // Standard string sorting for other fields
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (sortConfig.direction === 'asc') {
          return aValue.toString().localeCompare(bValue.toString());
        } else {
          return bValue.toString().localeCompare(aValue.toString());
        }
      }
    });

    return sorted;
  })();

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
                <th 
                  scope="col" 
                  className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wide cursor-pointer hover:bg-gray-100 ${
                    sortConfig.key === 'code' ? 'text-blue-600' : 'text-gray-500'
                  }`}
                  onClick={() => requestSort('code')}
                >
                  <div className="flex items-center">
                    <span>Codice</span>
                    {sortConfig.key === 'code' && (
                      <span className="ml-1">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Nome
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Misura (mm)
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Min Animali/Kg
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Max Animali/Kg
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Note
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                    Caricamento taglie...
                  </td>
                </tr>
              ) : filteredAndSortedSizes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                    Nessuna taglia trovata
                  </td>
                </tr>
              ) : (
                filteredAndSortedSizes.map((size: any) => {
                  // Determine badge color based on size code
                  let badgeColor = 'bg-blue-100 text-blue-800';
                  
                  // Tutte le taglie ora dovrebbero essere TP-XXX
                  if (size.code.startsWith('TP-')) {
                    // Estrai il numero dalla taglia TP-XXX
                    const numStr = size.code.substring(3);
                    const num = parseInt(numStr);
                    
                    if (num <= 1000) {
                      badgeColor = 'bg-red-100 text-red-800';
                    } else if (num <= 3000) {
                      badgeColor = 'bg-orange-100 text-orange-800';
                    } else if (num <= 6000) {
                      badgeColor = 'bg-yellow-100 text-yellow-800';
                    } else if (num <= 10000) {
                      badgeColor = 'bg-green-100 text-green-800';
                    } else {
                      badgeColor = 'bg-black text-white';
                    }
                  } else if (size.code.startsWith('M')) {
                    badgeColor = 'bg-green-100 text-green-800';
                  }
                  
                  return (
                    <tr key={size.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Badge className={`${badgeColor} text-xs`}>
                          {size.code}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {size.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {size.sizeMm}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {size.minAnimalsPerKg}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {size.maxAnimalsPerKg}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                        {size.notes || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setEditingSize(size)}>
                          <Pencil className="h-3 w-3 text-gray-600" />
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
