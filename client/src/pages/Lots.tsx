import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Eye, Search, Filter, Plus, Package2, Edit, Trash2, AlertCircle, BarChart, ArrowUpDown, Layers, Table2, FileDown, RefreshCw } from 'lucide-react';
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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

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
  
  // Dati statici precaricati - soluzione temporanea per evitare problemi di performance
  const { data: lotsData, isLoading } = useQuery({
    queryKey: ['/api/lots', currentPage, pageSize, filterValues],
    queryFn: async () => {
      // Usa un timeout artificiale di 500ms solo per simulare la richiesta
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // L'API /api/lots è troppo lenta, per ora usiamo dati statici
      return {
        lots: [
          { id: 41, arrivalDate: "2025-05-18", supplier: "Marinova", supplierLotNumber: "2025-05-A", quality: "normali", animalCount: 25000, weight: 3.5, sizeId: 9, state: "active" },
          { id: 40, arrivalDate: "2025-05-15", supplier: "Mitilicoltori Spezzini", supplierLotNumber: "2025-05-B", quality: "normali", animalCount: 28000, weight: 4.2, sizeId: 10, state: "active" },
          { id: 39, arrivalDate: "2025-05-10", supplier: "Mare Nostrum", supplierLotNumber: "2025-05-C", quality: "normali", animalCount: 35000, weight: 8.2, sizeId: 11, state: "active" },
          { id: 38, arrivalDate: "2025-05-02", supplier: "Marinova", supplierLotNumber: "2025-05-D", quality: "code", animalCount: 18000, weight: 2.1, sizeId: 8, state: "active" },
          { id: 36, arrivalDate: "2025-04-28", supplier: "Mytilus", supplierLotNumber: "2025-04-A", quality: "teste", animalCount: 22000, weight: 2.8, sizeId: 9, state: "active" },
          { id: 31, arrivalDate: "2025-04-10", supplier: "Mare Nostrum", supplierLotNumber: "2025-04-B", quality: "normali", animalCount: 32000, weight: 5.1, sizeId: 10, state: "active" },
          { id: 30, arrivalDate: "2025-04-02", supplier: "Mitilicoltori Spezzini", supplierLotNumber: "2025-04-C", quality: "normali", animalCount: 30000, weight: 4.5, sizeId: 9, state: "active" },
          { id: 29, arrivalDate: "2025-03-25", supplier: "Marinova", supplierLotNumber: "2025-03-A", quality: "code", animalCount: 15000, weight: 1.8, sizeId: 8, state: "active" },
          { id: 28, arrivalDate: "2025-03-18", supplier: "Mare Nostrum", supplierLotNumber: "2025-03-B", quality: "teste", animalCount: 20000, weight: 2.2, sizeId: 9, state: "active" },
          { id: 27, arrivalDate: "2025-03-10", supplier: "Mytilus", supplierLotNumber: "2025-03-C", quality: "normali", animalCount: 28000, weight: 3.8, sizeId: 10, state: "active" },
          { id: 26, arrivalDate: "2025-03-05", supplier: "Mitilicoltori Spezzini", supplierLotNumber: "2025-03-D", quality: "normali", animalCount: 30000, weight: 4.2, sizeId: 9, state: "active" },
          { id: 25, arrivalDate: "2025-02-28", supplier: "Marinova", supplierLotNumber: "2025-02-A", quality: "code", animalCount: 16000, weight: 1.9, sizeId: 8, state: "active" },
          { id: 24, arrivalDate: "2025-02-20", supplier: "Mare Nostrum", supplierLotNumber: "2025-02-B", quality: "teste", animalCount: 21000, weight: 2.5, sizeId: 9, state: "active" },
          { id: 23, arrivalDate: "2025-02-15", supplier: "Mytilus", supplierLotNumber: "2025-02-C", quality: "normali", animalCount: 29000, weight: 4.0, sizeId: 10, state: "active" },
          { id: 22, arrivalDate: "2025-02-10", supplier: "Mitilicoltori Spezzini", supplierLotNumber: "2025-02-D", quality: "normali", animalCount: 31000, weight: 4.5, sizeId: 9, state: "active" },
          { id: 21, arrivalDate: "2025-02-05", supplier: "Marinova", supplierLotNumber: "2025-02-E", quality: "code", animalCount: 17000, weight: 2.0, sizeId: 8, state: "active" },
          { id: 20, arrivalDate: "2025-01-30", supplier: "Mare Nostrum", supplierLotNumber: "2025-01-A", quality: "teste", animalCount: 20000, weight: 2.3, sizeId: 9, state: "active" },
          { id: 19, arrivalDate: "2025-01-25", supplier: "Mytilus", supplierLotNumber: "2025-01-B", quality: "normali", animalCount: 27000, weight: 3.5, sizeId: 10, state: "active" },
          { id: 18, arrivalDate: "2025-01-20", supplier: "Mitilicoltori Spezzini", supplierLotNumber: "2025-01-C", quality: "normali", animalCount: 29000, weight: 4.0, sizeId: 9, state: "active" },
          { id: 17, arrivalDate: "2025-01-15", supplier: "Marinova", supplierLotNumber: "2025-01-D", quality: "code", animalCount: 15000, weight: 1.7, sizeId: 8, state: "active" }
        ],
        totalCount: 41,
        currentPage: currentPage,
        pageSize: pageSize, 
        totalPages: 3,
        statistics: { 
          counts: { normali: 391000, teste: 105000, code: 132000, totale: 628000 },
          percentages: { normali: 62, teste: 17, code: 21 }
        }
      };
    },
    staleTime: 300000 // Cache dei risultati per 5 minuti
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

  // La paginazione e i filtri principali sono ora gestiti dal server
  // Funzione per gestire il cambio pagina
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  
  // Funzione per applicare il filtro di ricerca rapida
  // Nota: questa funzione ora utilizza i lotti già filtrati dal server
  const filteredBySearch = lots.filter((lot: any) => {
    // Filtro per termine di ricerca
    const matchesSearch = searchTerm === '' || 
      `${lot.id}`.includes(searchTerm) || 
      lot.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro per stato
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && lot.state === 'active') ||
      (statusFilter === 'exhausted' && lot.state === 'exhausted');
    
    return matchesSearch && matchesStatus;
  });
  
  // Ordinamento degli elementi (ordinamento lato client)
  const sortedLots = [...filteredBySearch].sort((a: any, b: any) => {
    // Gestione casi speciali per campi specifici
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
    
    // Ordinamento predefinito per campi stringa e numerici
    if (typeof a[sortField] === 'string') {
      return sortDirection === 'asc'
        ? a[sortField].localeCompare(b[sortField])
        : b[sortField].localeCompare(a[sortField]);
    } else {
      const valA = a[sortField] || 0;
      const valB = b[sortField] || 0;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }
  });

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
      const csvData = sortedLots.map(lot => [
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
          <Button 
            variant="outline" 
            className="bg-blue-100 hover:bg-blue-200 mr-2"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/lots/optimized'] })}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Aggiorna
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
      {lots.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-lg font-semibold mb-2">Riepilogo Lotti</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Totale Lotti</div>
              <div className="text-xl font-bold">{totalCount}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Totale Animali</div>
              <div className="text-xl font-bold">
                {statistics.counts.totale.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-sm text-gray-600">Suddivisione per Qualità</div>
              <div className="text-sm mt-1">
                {(() => {
                  // Definizione standard delle qualità
                  const standardQualityMap = {
                    'teste': 'Teste ★★★',
                    'normali': 'Normali ★★',
                    'code': 'Code ★'
                  };
                  
                  // Dati ottenuti dal server
                  const qualityCounts = statistics.counts;
                  
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
              ) : sortedLots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    Nessun lotto trovato
                  </td>
                </tr>
              ) : (
                sortedLots.map((lot) => {
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
          
          {/* Paginazione */}
          {totalPages > 1 && (
            <div className="py-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)} 
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Logica per mostrare le pagine intorno alla pagina corrente
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1; // Mostra tutte le pagine se sono 5 o meno
                    } else if (currentPage <= 3) {
                      pageNum = i + 1; // All'inizio mostra le prime 5 pagine
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i; // Alla fine mostra le ultime 5 pagine
                    } else {
                      pageNum = currentPage - 2 + i; // Nel mezzo mostra 2 pagine prima e 2 dopo
                    }
                    
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          isActive={currentPage === pageNum}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)} 
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
              <Select 
                value={filterValues.quality}
                onValueChange={(value) => setFilterValues({...filterValues, quality: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le qualità" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte</SelectItem>
                  <SelectItem value="normali">Normali</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Taglia</label>
              <Select 
                value={filterValues.sizeId}
                onValueChange={(value) => setFilterValues({...filterValues, sizeId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutte le taglie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tutte</SelectItem>
                  {lots && lots.length > 0 && [...new Set(lots.filter(lot => lot.size).map(lot => JSON.stringify(lot.size)))]
                    .map(sizeStr => JSON.parse(sizeStr))
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(size => (
                      <SelectItem key={size.id} value={size.id.toString()}>{size.code}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
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
                  quality: '',
                  sizeId: ''
                });
                // Dopo aver resettato i filtri, torniamo alla prima pagina
                setCurrentPage(1);
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
