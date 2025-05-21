import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Eye, Search, Filter, Plus, Package2, Edit, Trash2, AlertCircle, BarChart, ArrowUpDown, Layers, Table2, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from "@/hooks/use-toast";
import LotFormNew from '@/components/LotFormNew';
// Nessun bisogno di importare esplicitamente il tipo
import LotInventoryPanel from '@/components/lot-inventory/LotInventoryPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Lots() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [sortField, setSortField] = useState('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'simple' | 'detailed'>('simple');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Filtri avanzati
  const [filterValues, setFilterValues] = useState({
    id: '',
    dateFrom: '',
    dateTo: '',
    supplier: '',
    quality: '',
    sizeId: ''
  });
  
  // Prepara i parametri per la query ottimizzata
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.append('page', currentPage.toString());
    params.append('pageSize', pageSize.toString());
    
    // Aggiungi i filtri avanzati solo se valorizzati
    if (filterValues.supplier) params.append('supplier', filterValues.supplier);
    if (filterValues.quality) params.append('quality', filterValues.quality);
    if (filterValues.dateFrom) params.append('dateFrom', filterValues.dateFrom);
    if (filterValues.dateTo) params.append('dateTo', filterValues.dateTo);
    if (filterValues.sizeId) params.append('sizeId', filterValues.sizeId);
    
    return params.toString();
  };
  
  // Query lotti ottimizzata con paginazione e filtri
  const { data: lotsData, isLoading } = useQuery({
    queryKey: ['/api/lots/optimized', currentPage, pageSize, filterValues],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const response = await fetch(`/api/lots/optimized?${queryParams}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei lotti');
      }
      return response.json();
    }
  });
  
  // Estrai i dati dai risultati
  const lots = lotsData?.lots || [];
  const totalPages = lotsData?.totalPages || 1;
  const totalCount = lotsData?.totalCount || 0;
  const statistics = lotsData?.statistics || { 
    counts: { normali: 0, teste: 0, code: 0, totale: 0 },
    percentages: { normali: 0, teste: 0, code: 0 }
  };
  
  // Query inventario per tutti i lotti
  const { data: lotInventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['/api/lot-inventory/all-summary'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/lot-inventory/all-summary');
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Errore nel caricamento dei dati di inventario');
        return data.inventorySummaries || [];
      } catch (error) {
        console.error('Errore nel caricamento dei dati di inventario:', error);
        return [];
      }
    },
    enabled: viewMode === 'detailed'
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
    
    // Apply advanced filters
    // Filter by ID
    const matchesId = filterValues.id === '' || 
      lot.id.toString() === filterValues.id.trim();
    
    // Filter by supplier
    const matchesSupplier = filterValues.supplier === '' || 
      lot.supplier.toLowerCase().includes(filterValues.supplier.toLowerCase().trim());
    
    // Filter by date range
    let matchesDateRange = true;
    if (filterValues.dateFrom || filterValues.dateTo) {
      const lotDate = new Date(lot.arrivalDate);
      
      if (filterValues.dateFrom && filterValues.dateTo) {
        const fromDate = new Date(filterValues.dateFrom);
        const toDate = new Date(filterValues.dateTo);
        // Aggiungiamo un giorno alla data finale per includere anche la data selezionata
        toDate.setDate(toDate.getDate() + 1);
        matchesDateRange = lotDate >= fromDate && lotDate <= toDate;
      } else if (filterValues.dateFrom) {
        const fromDate = new Date(filterValues.dateFrom);
        matchesDateRange = lotDate >= fromDate;
      } else if (filterValues.dateTo) {
        const toDate = new Date(filterValues.dateTo);
        // Aggiungiamo un giorno alla data finale per includere anche la data selezionata
        toDate.setDate(toDate.getDate() + 1);
        matchesDateRange = lotDate <= toDate;
      }
    }
    
    // Filter by quality
    const matchesQuality = filterValues.quality === '' || 
      (lot.notes && lot.notes.toLowerCase().includes(filterValues.quality.toLowerCase().trim())) ||
      (lot.supplierLotNumber && lot.supplierLotNumber.toLowerCase().includes(filterValues.quality.toLowerCase().trim()));
    
    return matchesSearch && matchesStatus && matchesId && matchesSupplier && matchesDateRange && matchesQuality;
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
  
  // Funzione per esportare i dati in CSV
  const exportToCSV = () => {
    try {
      // Definiamo le intestazioni
      const headers = [
        'ID', 'Data Arrivo', 'Fornitore', 'Numero Lotto Fornitore', 
        'Qualità', 'Note', 'Stato', 'Numero Animali'
      ];
      
      // Prepariamo i dati
      const csvData = filteredLots.map(lot => [
        lot.id,
        lot.arrivalDate,
        lot.supplier,
        lot.supplierLotNumber || '',
        lot.quality || '',
        lot.notes || '',
        lot.state,
        lot.animalCount || 0
      ]);
      
      // Aggiungiamo le intestazioni all'inizio
      csvData.unshift(headers);
      
      // Convertiamo in stringhe CSV (con virgole come separatori)
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      // Creiamo un blob e un link per il download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `lotti_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      // Aggiungiamo il link, clicchiamo, e rimuoviamo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Esportazione completata",
        description: "I dati sono stati esportati con successo in formato CSV",
      });
    } catch (error) {
      console.error('Errore durante l\'esportazione:', error);
      toast({
        title: "Errore di esportazione",
        description: "Si è verificato un errore durante l'esportazione dei dati",
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Gestione Lotti</h2>
        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode(viewMode === 'simple' ? 'detailed' : 'simple')}
            className={viewMode === 'detailed' ? '' : 'bg-blue-600 hover:bg-blue-700 text-white'}
          >
            <Table2 className="h-4 w-4 mr-1" /> 
            {viewMode === 'simple' ? 'Vista Dettagliata' : 'Vista Semplice'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsFilterDialogOpen(true)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtra
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Esporta
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

      {/* Stats Summary */}
      {filteredLots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Riepilogo Lotti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Totale Lotti</div>
              <div className="text-xl font-bold">{filteredLots.length}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Totale Animali</div>
              <div className="text-xl font-bold">
                {filteredLots.reduce((total, lot) => total + (lot.animalCount || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Suddivisione per Qualità</div>
              <div className="text-sm mt-1">
                {(() => {
                  // Calcoliamo la suddivisione per le qualità standard prima
                  const standardQualityMap = {
                    'teste': 'Teste ★★★',
                    'normali': 'Normali ★★',
                    'code': 'Tails ★'
                  };
                  
                  // Raccogliamo i conteggi per qualità
                  const qualityCounts = filteredLots.reduce((acc, lot) => {
                    const quality = lot.quality || 'Non specificata';
                    if (!acc[quality]) acc[quality] = 0;
                    acc[quality] += (lot.animalCount || 0);
                    return acc;
                  }, {});
                  
                  // Otteniamo il totale degli animali
                  const totalAnimals: number = Object.values(qualityCounts).reduce((sum: number, count: any) => sum + (count as number), 0);
                  
                  // Riordiniamo e rendiamo più leggibili le qualità
                  return Object.entries(qualityCounts).sort((a, b) => {
                    // Mettiamo le qualità standard in cima
                    const aIsStandard = Object.keys(standardQualityMap).includes(a[0]);
                    const bIsStandard = Object.keys(standardQualityMap).includes(b[0]);
                    
                    if (aIsStandard && !bIsStandard) return -1;
                    if (!aIsStandard && bIsStandard) return 1;
                    
                    // Ordiniamo per conteggio (più alto in cima)
                    return (b[1] as number) - (a[1] as number);
                  }).map(([quality, count], index) => {
                    const displayQuality = Object.keys(standardQualityMap).includes(quality) 
                      ? standardQualityMap[quality as keyof typeof standardQualityMap]
                      : quality;
                    
                    const countValue = count as number;
                    const percentage = totalAnimals > 0 
                      ? (countValue / totalAnimals * 100).toFixed(1) 
                      : '0';
                    
                    return (
                      <div key={index} className="flex justify-between mt-1">
                        <span className="font-medium truncate max-w-[150px]">{displayQuality}:</span>
                        <span>
                          {(count as number).toLocaleString()} 
                          <span className="text-gray-500 ml-1">({percentage}%)</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Lots Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('id')}
                >
                  ID {sortField === 'id' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('arrivalDate')}
                >
                  Data {sortField === 'arrivalDate' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('supplier')}
                >
                  Fornitore {sortField === 'supplier' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('supplierLotNumber')}
                >
                  N.Lotto For. {sortField === 'supplierLotNumber' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('quality')}
                >
                  Qualità {sortField === 'quality' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-16"
                  onClick={() => handleSortClick('size')}
                >
                  Taglia {sortField === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                
                {/* Colonne inventario per vista dettagliata */}
                {viewMode === 'detailed' && (
                  <>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      Età (giorni)
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      Q.tà Iniziale
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      Q.tà Attuale
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      Venduti
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      Mortalità
                    </th>
                    <th 
                      scope="col" 
                      className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer bg-blue-50"
                    >
                      % Mortalità
                    </th>
                  </>
                )}
                
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('animalCount')}
                >
                  # Anim. {sortField === 'animalCount' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-20"
                  onClick={() => handleSortClick('weight')}
                >
                  Peso (g) {sortField === 'weight' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-16"
                  onClick={() => handleSortClick('state')}
                >
                  Stato {sortField === 'state' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  scope="col" 
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSortClick('notes')}
                >
                  Note {sortField === 'notes' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th scope="col" className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
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
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{lot.id}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {arrivalDate}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {lot.supplier}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {lot.supplierLotNumber || '-'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {lot.quality ? (
                          <span className="flex items-center">
                            {lot.quality === 'teste' && (
                              <span>
                                <span className="mr-1">Teste</span>
                                <span className="text-yellow-500">★★★</span>
                              </span>
                            )}
                            {lot.quality === 'normali' && (
                              <span>
                                <span className="mr-1">Normali</span>
                                <span className="text-yellow-500">★★</span>
                              </span>
                            )}
                            {lot.quality === 'code' && (
                              <span>
                                <span className="mr-1">Tails</span>
                                <span className="text-yellow-500">★</span>
                              </span>
                            )}
                            {!['teste', 'normali', 'code'].includes(lot.quality) && lot.quality}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          {lot.size ? lot.size.code : '-'}
                        </Badge>
                      </td>
                      
                      {/* Celle inventario per vista dettagliata */}
                      {viewMode === 'detailed' && (() => {
                        // Trova i dati di inventario per questo lotto
                        const inventoryData = lotInventoryData?.find((inv: { lotId: number }) => inv.lotId === lot.id);
                        
                        return (
                          <>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.ageInDays || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.initialCount?.toLocaleString() || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.currentCount?.toLocaleString() || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.soldCount?.toLocaleString() || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.mortalityCount?.toLocaleString() || '-'}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 bg-blue-50/30">
                              {inventoryData?.mortalityPercentage !== undefined 
                                ? `${inventoryData.mortalityPercentage.toFixed(2)}%` 
                                : '-'}
                            </td>
                          </>
                        );
                      })()}
                      
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {lot.animalCount ? lot.animalCount.toLocaleString() : '-'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500">
                        {lot.weight ? lot.weight.toLocaleString() : '-'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Badge className={`text-xs ${
                          lot.state === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {lot.state === 'active' ? 'Attivo' : 'Esaurito'}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[180px] truncate">
                        {lot.notes || '-'}
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Visualizza dettagli"
                            onClick={() => handleViewLot(lot)}
                            className="h-7 w-7">
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          {/* Il pulsante di modifica è stato rimosso come richiesto */}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={lot.state === 'active' ? 'Segna come esaurito' : 'Riattiva lotto'}
                            onClick={() => handleToggleLotState(lot)}
                            className="h-7 w-7">
                            <Package2 className={`h-4 w-4 ${lot.state === 'active' ? 'text-warning' : 'text-success'}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Elimina lotto"
                            onClick={() => handleDeleteLot(lot)}
                            className="h-7 w-7">
                            <Trash2 className="h-4 w-4 text-red-500" />
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
      {/* Filter Dialog */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Filtra lotti</DialogTitle>
            <DialogDescription>
              Imposta i filtri avanzati per i lotti
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ID Lotto</label>
              <Input 
                placeholder="Inserisci ID numerico" 
                value={filterValues.id}
                onChange={(e) => setFilterValues({...filterValues, id: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Fornitore</label>
              <Input 
                placeholder="Nome fornitore" 
                value={filterValues.supplier}
                onChange={(e) => setFilterValues({...filterValues, supplier: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data da</label>
              <Input 
                type="date" 
                value={filterValues.dateFrom}
                onChange={(e) => setFilterValues({...filterValues, dateFrom: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data a</label>
              <Input 
                type="date" 
                value={filterValues.dateTo}
                onChange={(e) => setFilterValues({...filterValues, dateTo: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Qualità</label>
              <Input 
                placeholder="Qualità/Descrizione" 
                value={filterValues.quality}
                onChange={(e) => setFilterValues({...filterValues, quality: e.target.value})}
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setFilterValues({
                  id: '',
                  dateFrom: '',
                  dateTo: '',
                  supplier: '',
                  quality: ''
                });
              }}
            >
              Reimposta filtri
            </Button>
            <Button 
              type="submit"
              onClick={() => setIsFilterDialogOpen(false)}
            >
              Applica filtri
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crea Nuovo Lotto</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli per creare un nuovo lotto
            </DialogDescription>
          </DialogHeader>
          <LotFormNew 
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
            <LotFormNew 
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
                notes: selectedLot.notes,
                sampleWeight: selectedLot.sampleWeight,
                sampleCount: selectedLot.sampleCount
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
                    {/* Il pulsante di modifica è stato rimosso come richiesto */}
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
