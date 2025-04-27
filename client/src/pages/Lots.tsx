import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Eye, Search, Filter, Plus, Package2, Edit, Trash2, AlertCircle, BarChart, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import LotForm from '@/components/LotForm';
import LotInventoryPanel from '@/components/lot-inventory/LotInventoryPanel';

export default function Lots() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Query lots
  const { data: lots, isLoading } = useQuery({
    queryKey: ['/api/lots'],
  });

  // Create mutation
  const createLotMutation = useMutation({
    mutationFn: (newLot: any) => apiRequest({
      url: '/api/lots',
      method: 'POST',
      body: newLot
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Lotto creato",
        description: "Il nuovo lotto è stato creato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la creazione del lotto",
        variant: "destructive",
      });
    }
  });

  // Update mutation
  const updateLotMutation = useMutation({
    mutationFn: (lotData: any) => apiRequest({
      url: `/api/lots/${lotData.id}`,
      method: 'PATCH',
      body: lotData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Lotto aggiornato",
        description: "Il lotto è stato aggiornato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento del lotto",
        variant: "destructive",
      });
    }
  });

  // Delete mutation
  const deleteLotMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/lots/${id}`,
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Lotto eliminato",
        description: "Il lotto è stato eliminato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione del lotto",
        variant: "destructive",
      });
    }
  });

  // Update lot state mutation
  const updateLotStateMutation = useMutation({
    mutationFn: ({ id, state }: { id: number, state: string }) => 
      apiRequest({
        url: `/api/lots/${id}`,
        method: 'PATCH',
        body: { state }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del lotto è stato aggiornato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dello stato",
        variant: "destructive",
      });
    }
  });

  // Function to handle sort click
  const handleSortClick = (field: string) => {
    if (sortField === field) {
      // Toggle direction if already sorting by this field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort lots
  const filteredLots = lots && Array.isArray(lots) ? lots.filter((lot: any) => {
    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${lot.id}`.includes(searchTerm) || 
      lot.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && lot.state === 'active') ||
      (statusFilter === 'exhausted' && lot.state === 'exhausted');
    
    return matchesSearch && matchesStatus;
  }).sort((a: any, b: any) => {
    // Handle special cases for certain fields
    if (sortField === 'arrivalDate') {
      const dateA = new Date(a[sortField]);
      const dateB = new Date(b[sortField]);
      return sortDirection === 'asc' 
        ? dateA.getTime() - dateB.getTime() 
        : dateB.getTime() - dateA.getTime();
    }
    
    if (sortField === 'size') {
      const sizeA = a.size?.code || '';
      const sizeB = b.size?.code || '';
      return sortDirection === 'asc'
        ? sizeA.localeCompare(sizeB)
        : sizeB.localeCompare(sizeA);
    }
    
    // Default sorting for string and number fields
    if (typeof a[sortField] === 'string') {
      return sortDirection === 'asc'
        ? a[sortField].localeCompare(b[sortField])
        : b[sortField].localeCompare(a[sortField]);
    } else {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  }) : [];

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
  
  const handleEditLot = (lot: any) => {
    setSelectedLot(lot);
    setIsEditDialogOpen(true);
  };
  
  const handleDeleteLot = (lot: any) => {
    setSelectedLot(lot);
    setIsDeleteDialogOpen(true);
  };
  
  const handleViewLot = (lot: any) => {
    setSelectedLot(lot);
    setIsViewDialogOpen(true);
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
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('id')}
                >
                  ID Lotto {sortField === 'id' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('arrivalDate')}
                >
                  Data Arrivo {sortField === 'arrivalDate' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('supplier')}
                >
                  Fornitore {sortField === 'supplier' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('quality')}
                >
                  Qualità {sortField === 'quality' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('size')}
                >
                  Taglia {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('animalCount')}
                >
                  # Animali {sortField === 'animalCount' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('weight')}
                >
                  Peso (g) {sortField === 'weight' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('state')}
                >
                  Stato {sortField === 'state' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('notes')}
                >
                  Note {sortField === 'notes' && (sortDirection === 'asc' ? '▲' : '▼')}
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
                        {lot.quality ? (
                          <span className="flex items-center">
                            {lot.quality === 'teste' && (
                              <span>
                                <span className="mr-1">Teste/Head</span>
                                <span className="text-yellow-500">★★★</span>
                              </span>
                            )}
                            {lot.quality === 'normali' && (
                              <span>
                                <span className="mr-1">Normali/Normal</span>
                                <span className="text-yellow-500">★★</span>
                              </span>
                            )}
                            {lot.quality === 'code' && (
                              <span>
                                <span className="mr-1">Code/Codes</span>
                                <span className="text-yellow-500">★</span>
                              </span>
                            )}
                            {!['teste', 'normali', 'code'].includes(lot.quality) && lot.quality}
                          </span>
                        ) : '-'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate">
                        {lot.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Visualizza dettagli"
                            onClick={() => handleViewLot(lot)}>
                            <Eye className="h-5 w-5 text-primary" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Modifica lotto"
                            onClick={() => handleEditLot(lot)}>
                            <Edit className="h-5 w-5 text-blue-500" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={lot.state === 'active' ? 'Segna come esaurito' : 'Riattiva lotto'}
                            onClick={() => handleToggleLotState(lot)}>
                            <Package2 className={`h-5 w-5 ${lot.state === 'active' ? 'text-warning' : 'text-success'}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Elimina lotto"
                            onClick={() => handleDeleteLot(lot)}>
                            <Trash2 className="h-5 w-5 text-red-500" />
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
            <DialogDescription>
              Inserisci i dettagli per creare un nuovo lotto
            </DialogDescription>
          </DialogHeader>
          <LotForm 
            onSubmit={(data) => createLotMutation.mutate(data)} 
            isLoading={createLotMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Lot Dialog */}
      {selectedLot && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifica Lotto #{selectedLot.id}</DialogTitle>
              <DialogDescription>
                Modifica i dettagli del lotto selezionato
              </DialogDescription>
            </DialogHeader>
            <LotForm 
              onSubmit={(data) => {
                // Manteniamo l'ID del lotto selezionato
                updateLotMutation.mutate({ ...data, id: selectedLot.id });
              }}
              isLoading={updateLotMutation.isPending}
              isEditing={true}
              defaultValues={{
                arrivalDate: selectedLot.arrivalDate,
                supplier: selectedLot.supplier,
                quality: selectedLot.quality,
                sizeId: selectedLot.sizeId,
                animalCount: selectedLot.animalCount,
                weight: selectedLot.weight,
                state: selectedLot.state,
                notes: selectedLot.notes
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* View Lot Details Dialog */}
      {selectedLot && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Dettagli Lotto #{selectedLot.id}</DialogTitle>
              <DialogDescription>
                Visualizzazione dettagliata delle informazioni del lotto
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informazioni Generali</TabsTrigger>
                <TabsTrigger value="inventory">
                  <BarChart className="h-4 w-4 mr-2" />
                  Inventario e Mortalità
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Data Arrivo</h4>
                      <div className="mt-1">{format(new Date(selectedLot.arrivalDate), 'dd MMMM yyyy', { locale: it })}</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Fornitore</h4>
                      <div className="mt-1">{selectedLot.supplier}</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Qualità</h4>
                      <div className="mt-1">
                        {selectedLot.quality ? (
                          <span className="flex items-center">
                            {selectedLot.quality === 'teste' && (
                              <span>
                                <span className="mr-1">Teste/Head</span>
                                <span className="text-yellow-500">★★★</span>
                              </span>
                            )}
                            {selectedLot.quality === 'normali' && (
                              <span>
                                <span className="mr-1">Normali/Normal</span>
                                <span className="text-yellow-500">★★</span>
                              </span>
                            )}
                            {selectedLot.quality === 'code' && (
                              <span>
                                <span className="mr-1">Code/Codes</span>
                                <span className="text-yellow-500">★</span>
                              </span>
                            )}
                            {!['teste', 'normali', 'code'].includes(selectedLot.quality) && selectedLot.quality}
                          </span>
                        ) : '-'}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Taglia</h4>
                      <div className="mt-1">
                        {selectedLot.size ? (
                          <Badge className="bg-blue-100 text-blue-800">
                            {selectedLot.size.code}
                          </Badge>
                        ) : '-'}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Numero Animali</h4>
                      <div className="mt-1">{selectedLot.animalCount ? selectedLot.animalCount.toLocaleString() : '-'}</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Peso (g)</h4>
                      <div className="mt-1">{selectedLot.weight ? selectedLot.weight.toLocaleString() : '-'}</div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-500">Stato</h4>
                      <div className="mt-1">
                        <Badge className={`${
                          selectedLot.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedLot.state === 'active' ? 'Attivo' : 'Esaurito'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {selectedLot.notes && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-500 mb-1">Note</h4>
                      <div className="text-sm mt-1">{selectedLot.notes}</div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Chiudi
                    </Button>
                    <Button onClick={() => {
                      setIsViewDialogOpen(false);
                      handleEditLot(selectedLot);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="inventory">
                <LotInventoryPanel 
                  lotId={selectedLot.id}
                  lotName={`${selectedLot.id} - ${selectedLot.supplier}`}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Lot Confirmation Dialog */}
      {selectedLot && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Conferma Eliminazione</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler eliminare il lotto #{selectedLot.id} ({selectedLot.supplier})?
                <div className="mt-2 p-2 bg-orange-50 text-orange-700 border border-orange-100 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Questa azione è permanente e non può essere annullata. Tutti i dati relativi a questo lotto verranno persi.</span>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex space-x-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Annulla
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteLotMutation.mutate(selectedLot.id)}
                disabled={deleteLotMutation.isPending}
              >
                {deleteLotMutation.isPending ? "Eliminazione in corso..." : "Elimina Lotto"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
