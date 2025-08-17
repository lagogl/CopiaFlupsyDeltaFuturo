import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatNumberWithCommas } from '@/lib/utils';
import { useWebSocketMessage } from '@/lib/websocket';

// Definizioni dei tipi principali
interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number;
  maxAnimalsPerKg: number;
  notes: string;
  color: string;
}

interface Lot {
  id: number;
  name?: string; // Nome del lotto 
  arrivalDate: string;
  supplier: string;
  supplierLot: string;
  supplierLotNumber?: string | null; // Campo alternativo per il lotto fornitore
  quantity: number;
  unitOfMeasure: string;
  notes: string;
  animalCount: number;
}

interface Sgr {
  id: number;
  month: string;
  percentage: number;
  calculationMethod: string;
}

interface Flupsy {
  id: number;
  name: string;
  location: string;
  description: string;
  active: boolean;
  maxPositions: number;
  productionCenter: string | null;
}

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  cycleCode: string;
  state: string;
  currentCycleId: number | null;
  nfcData: string | null;
  row: string | null;
  position: number | null;
  flupsy: Flupsy;
}

interface Cycle {
  id: number;
  basketId: number;
  startDate: string;
  endDate: string | null;
  state: string;
}

interface Operation {
  id: number;
  date: string;
  type: string;
  basketId: number;
  cycleId: number;
  sizeId: number | null;
  sgrId: number | null;
  lotId: number | null;
  animalCount: number | null;
  totalWeight: number | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  deadCount: number | null;
  mortalityRate: number | null;
  notes: string | null;
  metadata: any | null;
  basket?: Basket;
  cycle?: Cycle;
  size?: Size | null;
  sgr?: Sgr | null;
  lot?: Lot | null;
}
import { 
  Eye, Search, Filter, Pencil, Plus, Trash2, AlertTriangle, Copy, 
  ArrowDown, ArrowUp, RotateCw, Calendar, Box, Target, Check,
  ArrowUpDown, ArrowDownUp, MoreVertical, MapPin, ArrowRightCircle,
  BarChart3, Hash, Ruler, Activity, Edit, Trash, Info, FileText, 
  ChevronDown, ChevronUp, Beaker, ShoppingCart, Scissors
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { monthlyToDaily } from '@/lib/utils';
import OperationForm from '@/components/OperationFormCompact';
import GrowthPerformanceIndicator from '@/components/GrowthPerformanceIndicator';
import { useLocation, useSearch } from 'wouter';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export default function Operations() {
  console.log('🚨🚨🚨 OPERATIONS COMPONENT LOADING 🚨🚨🚨');
  const queryClient = useQueryClient();
  
  // Log di debug per il componente
  React.useEffect(() => {
    console.log('🔥 OPERATIONS COMPONENT MOUNTED 🔥');
    console.log('QueryClient disponibile:', !!queryClient);
  }, []);

  // Funzione per reset completo cache (DEBUG)
  const handleCompleteReset = async () => {
    try {
      console.log('🧹 INIZIO RESET COMPLETO CACHE');
      
      // 1. Pulizia React Query cache
      console.log('1. Pulizia cache React Query...');
      queryClient.clear();
      
      // 2. Pulizia localStorage
      console.log('2. Pulizia localStorage...');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`   Rimosso ${keysToRemove.length} chiavi dal localStorage`);
      
      // 3. Pulizia sessionStorage
      console.log('3. Pulizia sessionStorage...');
      sessionStorage.clear();
      
      // 4. Invalidazione cache server
      console.log('4. Invalidazione cache server...');
      await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keys: ['operations', 'baskets', 'cycles', 'flupsys', 'sizes', 'lots', 'sgr', 'unified']
        })
      });
      
      // 5. Forza refresh dati
      console.log('5. Refresh forzato dati...');
      await refetchUnified();
      
      console.log('✅ RESET COMPLETO COMPLETATO');
      
      toast({
        title: "Reset Cache Completato",
        description: "Tutte le cache sono state pulite e i dati ricaricati",
        duration: 3000
      });
      
    } catch (error) {
      console.error('❌ Errore durante reset cache:', error);
      toast({
        title: "Errore Reset Cache",
        description: "Si è verificato un errore durante la pulizia delle cache",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // WebSocket listeners per aggiornamenti real-time
  useWebSocketMessage('operation_created', () => {
    console.log('📋 OPERATIONS: Nuova operazione creata, aggiorno lista');
    // Invalida tutte le query delle operazioni per forzare l'aggiornamento
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/operations-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['/api/operations-unified'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
  });
  
  useWebSocketMessage('basket_updated', () => {
    console.log('📋 OPERATIONS: Cestello aggiornato, aggiorno dati');
    // Invalida le query correlate
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    queryClient.invalidateQueries({ queryKey: ['/api/operations-optimized'] });
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
  });
  
  // Reset del filtro data se presente nel localStorage per questa release
  React.useEffect(() => {
    const savedFilters = localStorage.getItem('app_filters_operations');
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        if (parsedFilters.dateFilter) {
          // Reset solo il campo dateFilter per permettere la visualizzazione di tutte le operazioni
          localStorage.setItem('app_filters_operations', JSON.stringify({
            ...parsedFilters,
            dateFilter: ''
          }));
        }
      } catch (e) {
        console.error('Errore reset filtro data:', e);
      }
    }
  }, []);

  // Filtri persistenti usando il nostro hook personalizzato
  const [filters, setFilters] = useFilterPersistence('operations', {
    searchTerm: '',
    typeFilter: 'all',
    dateFilter: '',
    flupsyFilter: 'all',
    cycleFilter: 'all',
    cycleStateFilter: 'active', // Ripristinato - mostra solo cicli attivi
    viewMode: 'cycles' as 'table' | 'cycles'
  });


  
  // Non estraiamo più i filtri in variabili locali perché non rimangono sincronizzate
  // quando i filtri cambiano. Useremo direttamente filters.searchTerm, ecc.
  
  // Funzioni aggiornate per impostare i filtri
  const setSearchTerm = (value: string) => setFilters(prev => ({ ...prev, searchTerm: value }));
  const setTypeFilter = (value: string) => setFilters(prev => ({ ...prev, typeFilter: value }));
  const setDateFilter = (value: string) => setFilters(prev => ({ ...prev, dateFilter: value }));
  const setFlupsyFilter = (value: string) => setFilters(prev => ({ ...prev, flupsyFilter: value }));
  const setCycleFilter = (value: string) => setFilters(prev => ({ ...prev, cycleFilter: value }));
  const setCycleStateFilter = (value: string) => setFilters(prev => ({ ...prev, cycleStateFilter: value }));
  const setViewMode = (value: 'table' | 'cycles') => setFilters(prev => ({ ...prev, viewMode: value }));
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  }>({ key: 'date', direction: 'descending' });
  
  const [expandedCycles, setExpandedCycles] = useState<number[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletePrimaAttivazioneDialogOpen, setIsDeletePrimaAttivazioneDialogOpen] = useState(false);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [redirectToBasketAfterCreate, setRedirectToBasketAfterCreate] = useState<number | null>(null);
  const [initialCycleId, setInitialCycleId] = useState<number | null>(null);
  const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
  const [initialFlupsyId, setInitialFlupsyId] = useState<number | null>(null);
  const [initialBasketId, setInitialBasketId] = useState<number | null>(null);
  
  // Stato per la paginazione
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalOperations, setTotalOperations] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Funzione per cambiare pagina
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll verso l'alto della tabella quando si cambia pagina
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const [_, navigate] = useLocation(); // using second parameter as navigate
  const searchParams = useSearch();
  
  // Unified query that loads all operations data in a single call
  const { 
    data: unifiedData, 
    isLoading: isLoadingUnified, 
    refetch: refetchUnified,
    error: unifiedError
  } = useQuery({
    queryKey: ['operations-unified'], // Chiave semplice e stabile
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minuti
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: 2,
    queryFn: async () => {
      console.log('🚀🚀🚀 FETCHING UNIFIED DATA 🚀🚀🚀');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondi timeout
        
        const response = await fetch('/api/operations-unified', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const result = await response.json();
        
        console.log('✅✅✅ UNIFIED DATA RECEIVED ✅✅✅');
        console.log('Total operations:', result.data?.operations?.length || 0);
        

        
        return result.data || { operations: [], baskets: [], cycles: [], flupsys: [], sizes: [], lots: [], sgr: [] };
      } catch (error) {
        console.error('❌❌❌ UNIFIED FETCH ERROR:', error);
        // Ritorna dati vuoti invece di far fallire
        return { operations: [], baskets: [], cycles: [], flupsys: [], sizes: [], lots: [], sgr: [] };
      }
    }
  });
  
  // Usa i dati unificati dal server
  const operations = React.useMemo(() => {
    const rawOperations = unifiedData?.operations || [];
    return rawOperations;
  }, [unifiedData?.operations]);

  // Gestione errori - mostra interfaccia anche in caso di problemi
  React.useEffect(() => {
    if (unifiedError) {
      console.error('❌ ERRORE QUERY UNIFICATA:', unifiedError);
      toast({
        title: "Problema di connessione",
        description: "Ricarica la pagina o riprova tra qualche secondo.",
        variant: "destructive",
        duration: 5000
      });
    }
  }, [unifiedError]);

  // Stato di caricamento migliorato - mostra interfaccia base anche durante il caricamento
  const showLoadingFallback = isLoadingUnified && !unifiedData;
  const hasData = unifiedData && !isLoadingUnified;
  

  const baskets = unifiedData?.baskets || [];
  const cycles = unifiedData?.cycles || [];
  const flupsys = unifiedData?.flupsys || [];
  const sizes = unifiedData?.sizes || [];
  const lots = unifiedData?.lots || [];
  const sgrData = unifiedData?.sgr || [];
  
  // Update pagination state when data changes
  React.useEffect(() => {
    if (unifiedData?.pagination) {
      setTotalOperations(unifiedData.pagination.totalOperations);
      setTotalPages(Math.ceil(unifiedData.pagination.totalOperations / pageSize));
    } else if (operations.length > 0) {
      // Fallback pagination logic
      setTotalOperations(operations.length);
      setTotalPages(Math.ceil(operations.length / pageSize));
    }
  }, [unifiedData, operations, pageSize]);
  
  // Loading states - all unified
  const isLoadingOperations = isLoadingUnified;
  const isLoadingBaskets = isLoadingUnified;
  const isLoadingCycles = isLoadingUnified;
  const isLoadingFlupsys = isLoadingUnified;
  const isLoadingSizes = isLoadingUnified;
  const isLoadingLots = isLoadingUnified;
  const isLoadingSgr = isLoadingUnified;
  
  // Refetch functions - all unified
  const refetchOperations = refetchUnified;
  const refetchBaskets = refetchUnified;
  const refetchCycles = refetchUnified;
  const refetchFlupsys = refetchUnified;
  
  // Alias for SGR data (for consistency in naming)
  const sgrs = sgrData;

  // Log filter changes for debugging
  React.useEffect(() => {
    console.log('🚀 FILTER CHANGE DEBUG v2:', { 
      flupsyFilter: filters.flupsyFilter,
      cycleStateFilter: filters.cycleStateFilter,
      basketsCount: baskets?.length,
      cyclesCount: cycles?.length,
      timestamp: new Date().toISOString()
    });
  }, [filters.flupsyFilter, filters.cycleStateFilter, baskets, cycles]);
  
  // Estrai i parametri dall'URL se presenti
  useEffect(() => {
    // Controlla se siamo nella route /operations/new
    const isNewOperation = window.location.pathname.endsWith('/operations/new');
    if (isNewOperation && searchParams) {
      const urlParams = new URLSearchParams(searchParams);
      
      // Parametri da estrarre dall'URL
      const selectedCycleId = urlParams.get('selectedCycleId');
      const flupsyId = urlParams.get('flupsyId');
      const basketId = urlParams.get('basketId');
      
      // Caso 1: Se c'è un ciclo selezionato
      if (selectedCycleId) {
        const cycleIdNumber = parseInt(selectedCycleId, 10);
        
        if (!isNaN(cycleIdNumber)) {
          // Attendi che i cicli siano caricati
          if (cycles) {
            // Verifica che il ciclo esista
            const cycleExists = cycles.find((c: any) => c.id === cycleIdNumber);
            
            if (cycleExists) {
              // Imposta il ciclo selezionato
              setInitialCycleId(cycleIdNumber);
              
              // Prepara un'operazione predefinita se sono presenti i parametri FLUPSY e cesta
              if (flupsyId && basketId) {
                const flupsyIdNumber = parseInt(flupsyId, 10);
                const basketIdNumber = parseInt(basketId, 10);
                
                if (!isNaN(flupsyIdNumber) && !isNaN(basketIdNumber)) {
                  // Imposta anche i valori di FLUPSY e cesta
                  setInitialFlupsyId(flupsyIdNumber);
                  setInitialBasketId(basketIdNumber);
                  console.log("Preselezionato FLUPSY e cesta:", flupsyIdNumber, basketIdNumber);
                  
                  // Crea un'operazione predefinita con i valori passati nell'URL
                  setSelectedOperation({
                    type: 'misura', // Tipo predefinito
                    date: new Date(),
                    basketId: basketIdNumber,
                    cycleId: cycleIdNumber,
                    flupsyId: flupsyIdNumber
                  });
                }
              }
              
              // Apri automaticamente il dialog di creazione operazione
              setIsCreateDialogOpen(true);
              console.log("Apertura automatica del dialog con ciclo:", cycleIdNumber);
              
              // Puliamo l'URL per evitare di riaprire il dialog se l'utente ricarica la pagina
              navigate('/operations', { replace: true });
            }
          }
        }
      }
      // Caso 2: Se non c'è un ciclo ma ci sono FLUPSY e cesta
      else if (flupsyId && basketId) {
        const flupsyIdNumber = parseInt(flupsyId, 10);
        const basketIdNumber = parseInt(basketId, 10);
        
        if (!isNaN(flupsyIdNumber) && !isNaN(basketIdNumber)) {
          // Imposta i valori di FLUPSY e cesta
          setInitialFlupsyId(flupsyIdNumber);
          setInitialBasketId(basketIdNumber);
          console.log("Preselezionato FLUPSY e cesta senza ciclo:", flupsyIdNumber, basketIdNumber);
          
          // Crea un'operazione predefinita con i valori passati nell'URL
          setSelectedOperation({
            type: 'misura', // Tipo predefinito
            date: new Date(),
            basketId: basketIdNumber,
            flupsyId: flupsyIdNumber
          });
          
          // Apri automaticamente il dialog di creazione operazione
          setIsCreateDialogOpen(true);
          
          // Puliamo l'URL per evitare di riaprire il dialog se l'utente ricarica la pagina
          navigate('/operations', { replace: true });
        }
      }
    }
  }, [searchParams, cycles, navigate]);

  // Create mutation
  const createOperationMutation = useMutation({
    mutationFn: async (newOperation: any) => {
      // Debug
      console.log('=============== CREATE OPERATION MUTATION ===============');
      console.log('Received operation data:', newOperation);
      
      // Recupera informazioni sulla cesta
      const basket = baskets?.find(b => b.id === newOperation.basketId);
      console.log('Found basket:', basket);
      
      // Determina se l'operazione è di prima attivazione o di vendita/selezione
      const isPrimaAttivazione = newOperation.type === 'prima-attivazione';
      const isVendita = newOperation.type === 'vendita' || newOperation.type === 'selezione-vendita';
      console.log('Operation type checks:', { isPrimaAttivazione, isVendita });
      
      // Determina lo stato della cesta
      const isBasketAvailable = basket?.state === 'available';
      const isBasketActive = basket?.state === 'active';
      console.log('Basket state checks:', { isBasketAvailable, isBasketActive });
      
      // Funzione helper per richieste con timeout
      const apiRequestWithTimeout = async (options: any, timeoutMs = 30000) => {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Il server non ha risposto entro 30 secondi')), timeoutMs)
        );
        
        const requestPromise = apiRequest(options);
        return Promise.race([requestPromise, timeoutPromise]);
      };
      
      let createdOperation;
      
      // 1. Se la cesta è disponibile e l'operazione è di prima attivazione
      if (isBasketAvailable && isPrimaAttivazione) {
        // Mostra feedback all'operatore
        toast({
          title: "Inizializzazione in corso...",
          description: "Creazione del nuovo ciclo e registrazione della prima attivazione",
        });
        
        // Crea direttamente l'operazione di prima attivazione
        // Il backend si occuperà di creare il ciclo e aggiornare lo stato della cesta
        createdOperation = await apiRequest({
          url: '/api/direct-operations',
          method: 'POST',
          body: newOperation
        });
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 2. Se la cesta è attiva e l'operazione è di vendita
      else if (isBasketActive && isVendita) {
        // Mostra feedback all'operatore
        toast({
          title: "Registrazione vendita...",
          description: "Chiusura del ciclo e registrazione dell'operazione di vendita",
        });
        
        // Crea direttamente l'operazione di vendita
        // Il backend si occuperà di chiudere il ciclo e aggiornare lo stato della cesta
        createdOperation = await apiRequest({
          url: '/api/direct-operations',
          method: 'POST',
          body: newOperation
        });
        
        // Invalida le query per cicli e ceste
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      }
      // 3. Operazioni normali
      else {
        // Mostra feedback per operazioni standard
        const operationTypeNames = {
          'misura': 'misurazione',
          'peso': 'pesatura', 
          'mortalita': 'registrazione mortalità',
          'trasferimento': 'trasferimento',
          'controllo': 'controllo qualità'
        };
        
        const operationName = operationTypeNames[newOperation.type] || newOperation.type;
        
        toast({
          title: `Registrazione ${operationName}...`,
          description: "Salvataggio dei dati dell'operazione in corso",
        });
        
        // Utilizziamo la route diretta per tutte le operazioni normali
        // Questa è più resiliente e gestisce meglio i casi in cui cycleId manca
        createdOperation = await apiRequest({
          url: '/api/direct-operations',
          method: 'POST',
          body: newOperation
        });
      }
      
      return createdOperation;
    },
    onSuccess: (createdOperation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      setIsCreateDialogOpen(false);
      
      // Mostra notifica di successo
      const operationTypeNames = {
        'prima-attivazione': 'Prima Attivazione',
        'vendita': 'Vendita',
        'misura': 'Misurazione',
        'peso': 'Pesatura',
        'mortalita': 'Registrazione Mortalità',
        'trasferimento': 'Trasferimento',
        'controllo': 'Controllo Qualità'
      };
      
      const operationName = operationTypeNames[createdOperation.type] || createdOperation.type;
      
      toast({
        title: "✅ Operazione salvata con successo!",
        description: `${operationName} registrata correttamente per il cestello ${createdOperation.basketId}`,
      });
      
      // Se c'è un ID di cesta da reindirizzare, naviga alla filtrazione per quella cesta
      if (redirectToBasketAfterCreate) {
        // Navigazione alle operazioni filtrate per la cesta specifica
        toast({
          title: "Reindirizzamento...",
          description: "Caricamento delle operazioni della cesta selezionata",
        });
        
        // Resetta lo stato di reindirizzamento
        const basketId = redirectToBasketAfterCreate;
        setRedirectToBasketAfterCreate(null);
        
        // Aggiungi un breve delay per dare il tempo all'interfaccia di aggiornare i dati
        setTimeout(() => {
          navigate(`/operations?basket=${basketId}`);
        }, 300);
      } else {
        toast({
          title: "Operazione completata",
          description: "L'operazione è stata registrata con successo",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la registrazione dell'operazione",
        variant: "destructive",
      });
    }
  });
  
  // Update mutation
  const updateOperationMutation = useMutation({
    mutationFn: (data: any) => apiRequest({
      url: `/api/operations/${data.id}`,
      method: 'PATCH',
      body: data.operation
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsEditDialogOpen(false);
      setSelectedOperation(null);
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata aggiornata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento dell'operazione",
        variant: "destructive",
      });
    }
  });
  
  // Delete mutation
  const deleteOperationMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/emergency-delete/${id}`,
      method: 'POST'
    }),
    onSuccess: () => {
      // Invalida tutte le cache correlate per mantenere la sincronizzazione
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations-optimized'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations-unified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      // Invalida anche le cache specifiche per mini-mappa e visualizzatori
      queryClient.invalidateQueries({ queryKey: ['mini-map-baskets'] });
      queryClient.invalidateQueries({ queryKey: ['flupsy-visualizer'] });
      setIsDeleteDialogOpen(false);
      setSelectedOperation(null);
      toast({
        title: "Operazione completata",
        description: "L'operazione è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione dell'operazione",
        variant: "destructive",
      });
    }
  });

  // Group operations by cycle with enriched data
  const operationsByCycle = useMemo(() => {
    if (!operations || !cycles || !lots || !sizes || !flupsys) return {};
    
    // Log dello stato dei dati delle operazioni prima dell'elaborazione
    console.log("Stato iniziale operazioni:", operations);
    console.log("IDs operazioni:", operations.map(op => op.id));
    const pesoCount = operations.filter(op => op.type === 'peso').length;
    console.log(`PESO operations count: ${pesoCount}`);
    
    console.log("Mapping operazioni:", operations.map(op => ({
      id: op.id,
      type: op.type,
      cycleId: op.cycleId,
      lotId: op.lotId,
      hasLot: !!op.lot
    })));
    
    // Log dei lotti disponibili
    console.log("Lotti disponibili:", lots.map(l => ({ id: l.id })));
    
    const grouped: { [key: string]: any[] } = {};
    
    operations.forEach((op: any) => {
      if (!op.cycleId) return;
      
      const cycleId = op.cycleId.toString();
      if (!grouped[cycleId]) {
        grouped[cycleId] = [];
      }
      
      // Arricchisci i dati prima di aggiungerli al gruppo
      let enrichedOp = { ...op };
      
      // Arricchisci i dati del lotto se non presente ma c'è l'ID
      if (!enrichedOp.lot && enrichedOp.lotId && lots) {
        const matchingLot = lots.find((l: any) => l.id === enrichedOp.lotId);
        if (matchingLot) {
          enrichedOp.lot = matchingLot;
          console.log(`Lotto trovato per operazione ${op.id}: ${matchingLot.name}`);
        }
      }
      
      // Arricchisci i dati della taglia se non presente ma c'è l'ID
      if (!enrichedOp.size && enrichedOp.sizeId && sizes) {
        enrichedOp.size = sizes.find((s: any) => s.id === enrichedOp.sizeId);
      }
      
      // Arricchisci i dati del cestello con FLUPSY
      if (enrichedOp.basket && enrichedOp.basket.flupsyId && flupsys) {
        const flupsy = flupsys.find((f: any) => f.id === enrichedOp.basket.flupsyId);
        if (flupsy) {
          enrichedOp.basket.flupsy = flupsy;
        }
      }
      
      grouped[cycleId].push(enrichedOp);
    });
    
    // Sort operations in each cycle by date
    Object.keys(grouped).forEach(cycleId => {
      // Prima ordina le operazioni per data
      grouped[cycleId].sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      
      // Dopo l'ordinamento, propaga le informazioni di lotto all'interno dello stesso ciclo
      // per le operazioni che non hanno un lotto definito
      if (grouped[cycleId].length > 0) {
        let lastKnownLot = null;
        
        // Prima passata in avanti - propaga il lotto dalle operazioni precedenti
        for (let i = 0; i < grouped[cycleId].length; i++) {
          if (grouped[cycleId][i].lot) {
            lastKnownLot = grouped[cycleId][i].lot;
          } else if (lastKnownLot && (!grouped[cycleId][i].lot || !grouped[cycleId][i].lotId)) {
            // Se questa operazione non ha un lotto ma abbiamo un lotto noto dallo stesso ciclo
            // assegna il lotto noto a questa operazione
            grouped[cycleId][i].lot = lastKnownLot;
            grouped[cycleId][i].lotId = lastKnownLot.id;
            console.log(`Propagato lotto '${lastKnownLot.name}' all'operazione ${grouped[cycleId][i].id} (forward)`);
          }
        }
        
        // Seconda passata all'indietro - propaga il lotto dalle operazioni successive
        // Utile quando la prima operazione non ha un lotto ma le successive sì
        lastKnownLot = null;
        for (let i = grouped[cycleId].length - 1; i >= 0; i--) {
          if (grouped[cycleId][i].lot) {
            lastKnownLot = grouped[cycleId][i].lot;
          } else if (lastKnownLot && (!grouped[cycleId][i].lot || !grouped[cycleId][i].lotId)) {
            // Se questa operazione non ha un lotto ma abbiamo un lotto noto dallo stesso ciclo
            // assegna il lotto noto a questa operazione
            grouped[cycleId][i].lot = lastKnownLot;
            grouped[cycleId][i].lotId = lastKnownLot.id;
            console.log(`Propagato lotto '${lastKnownLot.name}' all'operazione ${grouped[cycleId][i].id} (backward)`);
          }
        }
      }
    });
    
    return grouped;
  }, [operations, cycles, lots, sizes, flupsys]);
  
  // Function to toggle cycle expansion
  const toggleCycleExpansion = (cycleId: number) => {
    if (expandedCycles.includes(cycleId)) {
      setExpandedCycles(expandedCycles.filter(id => id !== cycleId));
    } else {
      setExpandedCycles([...expandedCycles, cycleId]);
    }
  };
  
  // Function to get cycle details
  const getCycleDetails = (cycleId: number) => {
    return cycles?.find((c: any) => c.id === cycleId);
  };
  
  // Function to calculate growth between two measurement operations
  const calculateGrowthBetweenOperations = (prevOp: any, currOp: any) => {
    if (!prevOp || !currOp || !prevOp.animalsPerKg || !currOp.animalsPerKg) {
      return null;
    }
    
    // Calcola il peso medio in mg da animali/kg
    const prevWeight = 1000000 / prevOp.animalsPerKg;
    const currWeight = 1000000 / currOp.animalsPerKg;
    
    // Calcola la differenza in giorni tra le due date
    const prevDate = new Date(prevOp.date);
    const currDate = new Date(currOp.date);
    const daysDiff = differenceInDays(currDate, prevDate);
    
    if (daysDiff <= 0) return null;
    
    // Calcola la percentuale di crescita
    const weightDiff = currWeight - prevWeight;
    const growthPercent = (weightDiff / prevWeight) * 100;
    
    return {
      prevWeight,
      currWeight,
      weightDiff,
      daysDiff,
      growthPercent
    };
  };
  
  // Function to get SGR data for a specific month
  const getSgrForMonth = (date: Date) => {
    if (!sgrData || sgrData.length === 0) return null;
    
    const month = format(date, 'MMMM', { locale: it }).toLowerCase();
    return sgrData.find((sgr: any) => sgr.month.toLowerCase() === month);
  };
  
  // Function to calculate theoretical growth based on SGR
  const calculateTheoreticalGrowth = (date: Date, days: number) => {
    const sgrInfo = getSgrForMonth(date);
    if (!sgrInfo) return null;
    
    // I valori SGR dal database sono già percentuali giornaliere
    // Formula corretta per calcolare l'aumento di peso teorico:
    // W_t = W_0 * e^((SGR/100) * t)
    // 
    // La percentuale di crescita totale sarà: (W_t/W_0 - 1) * 100 = (e^((SGR/100) * t) - 1) * 100
    
    const dailySgrPercent = sgrInfo.percentage; // Già una percentuale giornaliera
    const theoreticalGrowthPercent = (Math.exp((dailySgrPercent / 100) * days) - 1) * 100;
    
    return {
      sgrMonth: sgrInfo.month,
      sgrPercentage: sgrInfo.percentage,
      sgrDailyPercentage: dailySgrPercent, // Già in percentuale giornaliera
      theoreticalGrowthPercent
    };
  };
  
  // Funzione per gestire il click sull'intestazione di una colonna
  const handleSortClick = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    });
  };
  
  // Funzione di ordinamento generica in base alla configurazione di ordinamento
  const sortData = (data: any[]) => {
    if (!sortConfig || !data || data.length === 0) return data;
    
    // Debug - mostra i campi delle operazioni
    console.log('Operazione di esempio:', data[0]);
    
    return [...data].sort((a, b) => {
      // Gestione speciale per il campo "data" che richiede conversione in oggetto Date
      if (sortConfig.key === 'date') {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return sortConfig.direction === 'ascending' ? aTime - bTime : bTime - aTime;
      }
      
      // Gestione per i campi numerici
      if (sortConfig.key === 'animalCount') {
        const aValue = parseInt(a.animalCount) || 0;
        const bValue = parseInt(b.animalCount) || 0;
        return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      if (sortConfig.key === 'totalWeight') {
        const aValue = parseFloat(a.totalWeight) || 0;
        const bValue = parseFloat(b.totalWeight) || 0;
        return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      if (sortConfig.key === 'averageWeight') {
        // Alcuni campi potrebbero usare 'average_weight' anziché 'averageWeight'
        const aValue = parseFloat(a.averageWeight || a.average_weight) || 0;
        const bValue = parseFloat(b.averageWeight || b.average_weight) || 0;
        return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      // Gestione per il ciclo
      if (sortConfig.key === 'cycleId') {
        const aId = a.cycleId || 0;
        const bId = b.cycleId || 0;
        return sortConfig.direction === 'ascending' ? aId - bId : bId - aId;
      }
      
      // Gestione per i campi di testo
      if (sortConfig.key === 'type') {
        const aType = a.type || '';
        const bType = b.type || '';
        return sortConfig.direction === 'ascending' 
          ? aType.localeCompare(bType) 
          : bType.localeCompare(aType);
      }
      
      // Gestione per i campi complessi (cestello)
      if (sortConfig.key === 'basket') {
        // Potrebbe essere a.basket.physicalNumber o a.basketNumber a seconda dei dati
        const aBasketNumber = a.basket?.physicalNumber || a.basketNumber || 0;
        const bBasketNumber = b.basket?.physicalNumber || b.basketNumber || 0;
        return sortConfig.direction === 'ascending' ? aBasketNumber - bBasketNumber : bBasketNumber - aBasketNumber;
      }
      
      // Gestione per i campi complessi (lotto)
      if (sortConfig.key === 'lot') {
        const aLotName = a.lot?.name || '';
        const bLotName = b.lot?.name || '';
        return sortConfig.direction === 'ascending' 
          ? aLotName.localeCompare(bLotName)
          : bLotName.localeCompare(aLotName);
      }
      
      // Fallback per altri campi
      return 0;
    });
  };
  
  // Filter operations - TEMPORANEO: BYPASS TUTTI I FILTRI
  const filteredOperations = useMemo(() => {
    if (!operations || !cycles || !lots) return [];
    
    // TEMPORANEO: Restituisci tutte le operazioni senza filtri
    return sortData(operations);
    
  }, [operations, cycles, lots, filters.searchTerm, filters.typeFilter, filters.dateFilter, filters.flupsyFilter, filters.cycleFilter, filters.cycleStateFilter, sortConfig]);
  
  // Get filtered cycles based on selected filters
  const filteredCycleIds = useMemo(() => {
    if (!cycles || !baskets) return [];
    
    // First, apply FLUPSY filter to get valid cycles
    let validCycles = cycles;
    
    // If a specific FLUPSY is selected, only include cycles from baskets in that FLUPSY
    if (filters.flupsyFilter !== 'all') {
      const selectedFlupsyId = parseInt(filters.flupsyFilter);
      const flupsyBaskets = baskets.filter((b: any) => b.flupsyId === selectedFlupsyId);
      const flupsyBasketIds = flupsyBaskets.map((b: any) => b.id);
      
      if (flupsyBasketIds.length === 0) {
        return [];
      }
      
      validCycles = cycles.filter((cycle: any) => flupsyBasketIds.includes(cycle.basketId));
    }
    
    return validCycles
      .filter((cycle: any) => {
        // Check cycle state filter
        const matchesCycleState = filters.cycleStateFilter === 'all' || 
          (filters.cycleStateFilter === 'active' && cycle.state === 'active') ||
          (filters.cycleStateFilter === 'closed' && cycle.state === 'closed');
        
        if (!matchesCycleState) return false;
        
        // Find operations for this cycle
        const cycleOps = operations?.filter((op: any) => op.cycleId === cycle.id) || [];
        if (cycleOps.length === 0) return false;
        
        // Check if any operation matches the type filter
        const matchesType = filters.typeFilter === 'all' || 
          cycleOps.some((op: any) => op.type === filters.typeFilter);
        
        // Check if any operation matches the date filter
        const matchesDate = filters.dateFilter === '' || 
          cycleOps.some((op: any) => format(new Date(op.date), 'yyyy-MM-dd') === filters.dateFilter);
        
        // Check if the cycle matches the cycle filter
        const matchesCycle = filters.cycleFilter === 'all' || 
          cycle.id.toString() === filters.cycleFilter;
        
        // Check if any operation matches the search term
        const matchesSearch = filters.searchTerm === '' || 
          `${cycle.id}`.includes(filters.searchTerm) || 
          cycleOps.some((op: any) => `${op.basketId}`.includes(filters.searchTerm));
        
        return matchesType && matchesDate && matchesCycle && matchesSearch;
      })
      .map((cycle: any) => cycle.id);
  }, [cycles, baskets, operations, filters.typeFilter, filters.dateFilter, filters.flupsyFilter, filters.cycleFilter, filters.cycleStateFilter, filters.searchTerm]);

  const getOperationTypeBadge = (type: string) => {
    let bgColor = 'bg-blue-100 text-blue-800';
    
    switch (type) {
      case 'prima-attivazione':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
      case 'pulizia':
        bgColor = 'bg-cyan-100 text-cyan-800';
        break;
      case 'vagliatura':
        bgColor = 'bg-indigo-100 text-indigo-800';
        break;
      case 'trattamento':
        bgColor = 'bg-amber-100 text-amber-800';
        break;
      case 'misura':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'vendita':
      case 'selezione-vendita':
        bgColor = 'bg-green-100 text-green-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    // Format operation type for display
    const displayType = type
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {displayType}
    </span>;
  };

  // Funzione per determinare la taglia in base al numero di animali per kg (animalsPerKg)
  const determineSizeFromAnimalsPerKg = (animalsPerKg: number) => {
    if (!sizes || !animalsPerKg) return null;
    
    // Trova la taglia corrispondente al range di animali per kg
    return sizes.find((size: any) => {
      const minAnimalsPerKg = size.minAnimalsPerKg || 0;
      const maxAnimalsPerKg = size.maxAnimalsPerKg || Number.MAX_SAFE_INTEGER;
      return animalsPerKg >= minAnimalsPerKg && animalsPerKg <= maxAnimalsPerKg;
    });
  };

  const getSizeBadge = (size: any) => {
    if (!size) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    let bgColor = 'bg-blue-100 text-blue-800';
    // Gestisce le taglie TP-XXX
    if (size.code.startsWith('TP-')) {
      // Estrai il numero dalla taglia TP-XXX
      const numStr = size.code.substring(3);
      const num = parseInt(numStr);
      
      if (num <= 1000) {
        bgColor = 'bg-red-100 text-red-800';
      } else if (num <= 3000) {
        bgColor = 'bg-orange-100 text-orange-800';
      } else if (num <= 6000) {
        bgColor = 'bg-yellow-100 text-yellow-800';
      } else if (num <= 10000) {
        bgColor = 'bg-green-100 text-green-800';
      } else {
        bgColor = 'bg-black text-white';
      }
    } else if (size.code.startsWith('M')) {
      bgColor = 'bg-green-100 text-green-800';
    }
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {size.code}
    </span>;
  };
  
  // Funzione che genera il badge di taglia basandosi sugli animali per kg
  const getSizeBadgeFromAnimalsPerKg = (animalsPerKg: number) => {
    if (!animalsPerKg) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    // Determina la taglia in base al numero di animali per kg
    const detectedSize = determineSizeFromAnimalsPerKg(animalsPerKg);
    
    if (detectedSize) {
      // Usa la taglia trovata
      return getSizeBadge(detectedSize);
    } else {
      // Se non troviamo una taglia corrispondente, mostra un badge generico con il peso medio approssimativo
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
          ~{Math.round(1000000 / animalsPerKg)} mg/animale
        </span>
      );
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h2 className="text-2xl font-condensed font-bold text-gray-800">Registro Operazioni</h2>
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2 bg-blue-100 hover:bg-blue-200 border-blue-300" 
            onClick={async () => {
              try {
                setIsRefreshingData(true);
                console.log('🔄 REFRESH: Invalidando tutte le cache...');
                
                // Invalida tutte le cache prima di fare il refetch
                queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
                queryClient.invalidateQueries({ queryKey: ['/api/operations-unified'] });
                queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
                queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
                queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
                queryClient.invalidateQueries({ queryKey: ['/api/lots'] });
                
                // Forza il refetch con parametri per bypassare cache
                await Promise.all([
                  refetchUnified(),
                  refetchOperations(),
                  refetchCycles(),
                  refetchBaskets()
                ]);
                
                console.log('🔄 REFRESH: Cache invalidate e dati aggiornati');
                
                toast({
                  title: "Aggiornamento completato",
                  description: "Il registro operazioni è stato aggiornato con i dati più recenti",
                  variant: "default"
                });
              } catch (error) {
                console.error('🔄 REFRESH: Errore durante aggiornamento:', error);
                toast({
                  title: "Errore durante l'aggiornamento",
                  description: "Si è verificato un problema durante l'aggiornamento dei dati",
                  variant: "destructive"
                });
              } finally {
                setIsRefreshingData(false);
              }
            }}
            disabled={isRefreshingData}
            title="Aggiorna dati"
          >
            {isRefreshingData ? (
              <div className="flex items-center">
                <div className="animate-spin w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                Aggiornamento...
              </div>
            ) : (
              <>
                <RotateCw className="h-4 w-4 mr-1 text-blue-600" />
                Aggiorna
              </>
            )}
          </Button>
          
        </div>
        
        
        <div className="flex space-x-3">
          <Button onClick={() => {
            // Resetta qualsiasi operazione precedentemente selezionata
            setSelectedOperation(null);
            // Apri il dialog di creazione operazione senza precompilare campi
            setIsCreateDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />
            Nuova Operazione
          </Button>
          
          {/* Pulsante Debug Reset Cache - SEMPRE VISIBILE per Edge */}
          <Button 
            onClick={handleCompleteReset}
            variant="destructive"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-red-800 shadow-lg"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            🧹 PULISCI CACHE
          </Button>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col space-y-4">
          {/* Mode Selection */}
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Button 
                variant={filters.viewMode === 'table' ? 'default' : 'outline'} 
                onClick={() => setViewMode('table')}
                className="w-32"
              >
                <Box className="mr-2 h-4 w-4" />
                Tabella
              </Button>
              <Button 
                variant={filters.viewMode === 'cycles' ? 'default' : 'outline'} 
                onClick={() => setViewMode('cycles')}
                className="w-32"
              >
                <RotateCw className="mr-2 h-4 w-4" />
                Per Ciclo
              </Button>
            </div>
            
            <div className="flex items-center">
              <ArrowUp className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-500">Ascendente</span>
            </div>
          </div>
          
          {/* First row of filters */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Cerca operazioni, ceste..."
                  value={filters.searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <Select value={filters.typeFilter} onValueChange={setTypeFilter}>
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
              <div className="flex items-center space-x-2">
                <Input 
                  type="date" 
                  value={filters.dateFilter || ''}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-40"
                  placeholder="Filtra per data"
                />
                {filters.dateFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter('')}
                    className="px-2 text-red-600 hover:text-red-700"
                    title="Rimuovi filtro data per vedere tutte le operazioni"
                  >
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* Second row of filters */}
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 md:flex-none md:w-1/2">
              <Select value={filters.flupsyFilter} onValueChange={setFlupsyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                  {flupsys?.map((flupsy: any) => {
                    // Conta i cestelli attivi per questo FLUPSY
                    const flupsyBaskets = baskets?.filter((b: any) => b.flupsyId === flupsy.id) || [];
                    const activeBaskets = flupsyBaskets.filter((b: any) => b.state === 'active').length;
                    const totalBaskets = flupsyBaskets.length;
                    
                    return (
                      <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                        <div className="flex justify-between items-center w-full">
                          <span>{flupsy.name}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {activeBaskets > 0 ? (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                {activeBaskets} attivi
                              </span>
                            ) : totalBaskets > 0 ? (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                                {totalBaskets} disponibili
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-500 rounded">
                                nessun cestello
                              </span>
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 md:flex-none md:w-1/2 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-3">
              <Select value={filters.cycleFilter} onValueChange={setCycleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtra per Ciclo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i Cicli</SelectItem>
                  {cycles?.filter((cycle: any) => {
                    // Se non è selezionato un FLUPSY specifico, mostra tutti i cicli
                    if (filters.flupsyFilter === 'all') return true;
                    
                    // Altrimenti, trova il cestello associato al ciclo
                    const basket = baskets?.find((b: any) => b.id === cycle.basketId);
                    
                    // Mostra il ciclo solo se il cestello appartiene al FLUPSY selezionato
                    return basket && basket.flupsyId.toString() === filters.flupsyFilter;
                  }).map((cycle: any) => {
                    const basket = baskets?.find((b: any) => b.id === cycle.basketId);
                    // Recupera l'ultima operazione per questo ciclo per ottenere la taglia attuale
                    const cycleOperations = operations?.filter((op: any) => op.cycleId === cycle.id) || [];
                    const lastOperation = cycleOperations.length > 0 
                      ? cycleOperations.sort((a: any, b: any) => 
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                        )[0] 
                      : null;
                    
                    // Recupera informazioni sulla taglia
                    const sizeName = lastOperation?.size?.code || '-';
                    
                    // Formatta la data di inizio
                    const startDate = cycle.startDate 
                      ? format(new Date(cycle.startDate), 'dd/MM/yy') 
                      : '';
                    
                    // Informazioni sulla posizione
                    const posInfo = basket ? `[${basket.row || ''} ${basket.position || ''}]` : '';
                    
                    return (
                      <SelectItem key={cycle.id} value={cycle.id.toString()}>
                        Ciclo #{cycle.id} - Cesta #{basket?.physicalNumber || '?'} {posInfo} - {startDate} - {sizeName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              {/* Filtro per Stato Ciclo con bottoni */}
              <div className="flex space-x-2 items-center">
                <span className="text-sm text-gray-500 mr-1">Stato:</span>
                <div className="flex rounded-md shadow-sm">
                  <Button
                    variant={filters.cycleStateFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-l-md rounded-r-none ${filters.cycleStateFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('active')}
                  >
                    Attivi
                  </Button>
                  <Button
                    variant={filters.cycleStateFilter === 'closed' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-none border-l-0 border-r-0 ${filters.cycleStateFilter === 'closed' ? 'bg-red-600 hover:bg-red-700 border-red-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('closed')}
                  >
                    Chiusi
                  </Button>
                  <Button
                    variant={filters.cycleStateFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className={`px-3 py-1.5 rounded-r-md rounded-l-none ${filters.cycleStateFilter === 'all' ? 'bg-blue-600 hover:bg-blue-700 border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
                    onClick={() => setCycleStateFilter('all')}
                  >
                    Tutti
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Riassunto Totali */}
      {!isLoadingOperations && !isLoadingCycles && !isLoadingBaskets && filteredOperations?.length > 0 && (() => {
        // Calcola i totali dai movimenti visualizzati
        const totals = {
          totalOperations: filteredOperations.length,
          totalAnimals: 0,
          totalWeight: 0,
          bySize: {} as Record<string, { animals: number; operations: number; weight: number }>,
          byType: {} as Record<string, { animals: number; operations: number; weight: number }>
        };

        filteredOperations.forEach((op: any) => {
          const animalCount = op.animalCount || 0;
          const weight = op.totalWeight || 0;
          const sizeCode = op.size?.code || 'Non specificata';
          const opType = op.type || 'unknown';

          // Calcolo corretto degli animali secondo la logica di business:
          // ENTRATE: prima-attivazione, ripopolamento (+)
          // USCITE: vendita, cessazione (-)
          // ALTRE: misura, peso, pulizia, vagliatura, dismissione (non modificano il totale)
          let animalMovement = 0;
          if (['prima-attivazione', 'ripopolamento'].includes(opType)) {
            animalMovement = animalCount; // Entrate positive
          } else if (['vendita', 'cessazione'].includes(opType)) {
            animalMovement = -animalCount; // Uscite negative
          }
          // Per le altre operazioni (misura, vagliatura, etc.) animalMovement rimane 0

          totals.totalAnimals += animalMovement;
          totals.totalWeight += weight;

          // Raggruppamento per taglia
          if (!totals.bySize[sizeCode]) {
            totals.bySize[sizeCode] = { animals: 0, operations: 0, weight: 0 };
          }
          totals.bySize[sizeCode].animals += animalMovement;
          totals.bySize[sizeCode].operations += 1;
          totals.bySize[sizeCode].weight += weight;

          // Raggruppamento per tipo operazione
          if (!totals.byType[opType]) {
            totals.byType[opType] = { animals: 0, operations: 0, weight: 0 };
          }
          totals.byType[opType].animals += animalMovement;
          totals.byType[opType].operations += 1;
          totals.byType[opType].weight += weight;
        });

        const typeLabels: Record<string, string> = {
          'misura': 'Misura',
          'prima-attivazione': 'Prima Attivazione',
          'dismissione': 'Dismissione',
          'vendita': 'Vendita',
          'vagliatura': 'Vagliatura',
          'pulizia': 'Pulizia',
          'trattamento': 'Trattamento'
        };

        return (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-100 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Riassunto Movimenti Visualizzati
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {totals.totalOperations} operazioni
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Totali generali */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-green-600" />
                  Totali Generali
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Animali:</span>
                    <span className="font-medium text-green-700">
                      {totals.totalAnimals.toLocaleString('it-IT')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Peso totale:</span>
                    <span className="font-medium text-green-700">
                      {totals.totalWeight > 0 ? `${totals.totalWeight.toLocaleString('it-IT')} g` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Suddivisione per taglia */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-orange-600" />
                  Per Taglia
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(totals.bySize)
                    .sort(([,a], [,b]) => b.animals - a.animals)
                    .map(([size, data]) => (
                      <div key={size} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            size.includes('TP-') ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {size}
                          </span>
                          <span className="text-gray-500">({data.operations} op.)</span>
                        </div>
                        <span className="font-medium text-orange-700">
                          {data.animals.toLocaleString('it-IT')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Suddivisione per tipo operazione */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-600" />
                  Per Tipologia
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(totals.byType)
                    .sort(([,a], [,b]) => b.animals - a.animals)
                    .map(([type, data]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">
                            {typeLabels[type as keyof typeof typeLabels] || type}
                          </span>
                          <span className="text-gray-500">({data.operations})</span>
                        </div>
                        <span className="font-medium text-purple-700">
                          {data.animals.toLocaleString('it-IT')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* View Mode Content (Table or Cycles) */}
      {isLoadingOperations || isLoadingCycles || isLoadingBaskets ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Caricamento dati...</p>
        </div>
      ) : (
        filters.viewMode === 'table' ? (
          // Table/Card View (responsive)
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Desktop View (tabella) - visibile solo su desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('date')}
                    >
                      <div className="flex items-center">
                        Data
                        {sortConfig.key === 'date' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('type')}
                    >
                      <div className="flex items-center">
                        Tipo
                        {sortConfig.key === 'type' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('basket')}
                    >
                      <div className="flex items-center">
                        Cesta
                        {sortConfig.key === 'basket' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flupsy
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('cycleId')}
                    >
                      <div className="flex items-center">
                        Ciclo
                        {sortConfig.key === 'cycleId' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('lot')}
                    >
                      <div className="flex items-center">
                        Lotto
                        {sortConfig.key === 'lot' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taglia
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('animalCount')}
                    >
                      <div className="flex items-center">
                        # Anim.
                        {sortConfig.key === 'animalCount' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('totalWeight')}
                    >
                      <div className="flex items-center">
                        Peso (g)
                        {sortConfig.key === 'totalWeight' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortClick('averageWeight')}
                    >
                      <div className="flex items-center">
                        P.M. (mg)
                        {sortConfig.key === 'averageWeight' && (
                          <span className="ml-2">
                            {sortConfig.direction === 'ascending' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-2 whitespace-nowrap text-center text-gray-500">
                        Nessuna operazione trovata
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op) => (
                      <tr key={op.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(op.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {getOperationTypeBadge(op.type)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            #{op.basket?.physicalNumber || op.basketId}
                            {op.basket?.row && op.basket?.position && (
                              <span className="text-xs block text-indigo-600 mt-1">
                                Posizione: {op.basket.row} - {op.basket.position}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            // Prima controlla se l'operazione ha già il nome del FLUPSY
                            if (op.flupsyName) {
                              return (
                                <div>
                                  <span className="font-medium text-blue-600">
                                    {op.flupsyName}
                                  </span>
                                </div>
                              );
                            }
                            
                            // Trova il cestello associato all'operazione
                            const basket = baskets?.find((b: any) => b.id === op.basketId);
                            
                            // Se il cestello ha un flupsyId, trova il FLUPSY corrispondente
                            if (basket?.flupsyId) {
                              const flupsy = flupsys?.find((f: any) => f.id === basket.flupsyId);
                              if (flupsy) {
                                return (
                                  <div>
                                    <span className="font-medium text-blue-600">
                                      {flupsy.name}
                                    </span>
                                  </div>
                                );
                              }
                            }
                            
                            // Se il basket dell'operazione ha il flupsyId, usalo
                            if (op.basket?.flupsyId) {
                              const flupsy = flupsys?.find((f: any) => f.id === op.basket.flupsyId);
                              if (flupsy) {
                                return (
                                  <div>
                                    <span className="font-medium text-blue-600">
                                      {flupsy.name}
                                    </span>
                                  </div>
                                );
                              }
                            }
                            
                            return '-';
                          })()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {op.cycleId ? `#${op.cycleId}` : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            // Caso speciale: l'operazione ha lotti multipli
                            if (op.hasMultipleLots && op.additionalLots && Array.isArray(op.additionalLots) && op.additionalLots.length > 0) {
                              const mainLot = op.lot || (op.lotId ? lots?.find((l: any) => l.id === op.lotId) : null);
                              return (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-indigo-600">
                                      {mainLot ? mainLot.name : 'Lotto principale'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                      Lotto misto
                                    </span>
                                  </div>
                                  {mainLot && (
                                    <>
                                      <span className="text-xs block text-gray-500">
                                        Arrivo: {format(new Date(mainLot.arrivalDate), 'dd/MM/yyyy')}
                                      </span>
                                      <span className="text-xs block text-gray-500">
                                        Fornitore: {mainLot.supplier || 'N/D'}
                                      </span>
                                    </>
                                  )}
                                  <details className="text-xs mt-1">
                                    <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800">
                                      Altri lotti ({op.additionalLots.length})
                                    </summary>
                                    <div className="pl-2 mt-1 border-l-2 border-indigo-200">
                                      {op.additionalLots.map((lot: any, idx: number) => (
                                        <div key={idx} className="mb-1.5">
                                          <div className="font-medium">{lot.name}</div>
                                          <div className="text-xs text-gray-500">
                                            Arrivo: {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Fornitore: {lot.supplier || 'N/D'}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              );
                            }
                            
                            // Prima controlla se l'operazione ha già un lotto
                            if (op.lot) {
                              return (
                                <div>
                                  <span className="font-medium text-indigo-600">{op.lot.name}</span>
                                  <span className="text-xs block text-gray-500">
                                    Arrivo: {format(new Date(op.lot.arrivalDate), 'dd/MM/yyyy')}
                                  </span>
                                  <span className="text-xs block text-gray-500">
                                    Fornitore: {op.lot.supplier || 'N/D'}
                                  </span>
                                </div>
                              );
                            }
                            
                            // Se ha un lotId, cerca il lotto nei dati disponibili
                            if (op.lotId) {
                              const lotById = lots?.find((l: any) => l.id === op.lotId);
                              if (lotById) {
                                return (
                                  <div>
                                    <span className="font-medium text-indigo-600">{lotById.name || `Lotto #${lotById.id}`}</span>
                                    <span className="text-xs block text-gray-500">
                                      Arrivo: {format(new Date(lotById.arrivalDate), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-xs block text-gray-500">
                                      Fornitore: {lotById.supplier || 'N/D'}
                                    </span>
                                  </div>
                                );
                              }
                            }
                            
                            // Se non ha né lotto né lotId, cerca un'operazione "prima-attivazione" nello stesso ciclo
                            const opsInSameCycle = operations?.filter((o: any) => o.cycleId === op.cycleId) || [];
                            const firstActivationInCycle = opsInSameCycle.find((o: any) => o.type === 'prima-attivazione');
                            
                            if (firstActivationInCycle && (firstActivationInCycle.lot || firstActivationInCycle.lotId)) {
                              // Se l'operazione prima-attivazione ha un lotto, usalo
                              if (firstActivationInCycle.lot) {
                                return (
                                  <div>
                                    <span className="font-medium text-indigo-600">{firstActivationInCycle.lot.name}</span>
                                    <span className="text-xs block text-gray-500">
                                      Arrivo: {format(new Date(firstActivationInCycle.lot.arrivalDate), 'dd/MM/yyyy')}
                                    </span>
                                    <span className="text-xs block text-gray-500">
                                      Fornitore: {firstActivationInCycle.lot.supplier || 'N/D'}
                                    </span>
                                  </div>
                                );
                              }
                              
                              // Se ha solo un lotId, cerca il lotto nei dati disponibili
                              if (firstActivationInCycle.lotId) {
                                const firstActivationLot = lots?.find((l: any) => l.id === firstActivationInCycle.lotId);
                                if (firstActivationLot) {
                                  return (
                                    <div>
                                      <span className="font-medium text-indigo-600">{firstActivationLot.name || `Lotto #${firstActivationLot.id}`}</span>
                                      <span className="text-xs block text-gray-500">
                                        Arrivo: {format(new Date(firstActivationLot.arrivalDate), 'dd/MM/yyyy')}
                                      </span>
                                      <span className="text-xs block text-gray-500">
                                        Fornitore: {firstActivationLot.supplier || 'N/D'}
                                      </span>
                                    </div>
                                  );
                                }
                              }
                            }
                            
                            // Se tutte le precedenti falliscono, mostra "Nessun lotto"
                            return <span className="text-gray-400 italic">Nessun lotto</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {op.size ? (
                            getSizeBadge(op.size)
                          ) : op.sizeId ? (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" 
                                  style={{ backgroundColor: sizes?.find((s: any) => s.id === op.sizeId)?.color || '#e5e7eb', color: '#111827' }}>
                              {sizes?.find((s: any) => s.id === op.sizeId)?.code || `Size #${op.sizeId}`}
                            </span>
                          ) : op.animalsPerKg ? (
                            // Usa la funzione per determinare la taglia in base al numero di animali per kg
                            getSizeBadgeFromAnimalsPerKg(op.animalsPerKg)
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {op.animalCount ? op.animalCount.toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {op.totalWeight ? parseFloat(op.totalWeight).toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0}) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                          {(() => {
                            // Prima prova con animalsPerKg se disponibile (per retrocompatibilità)
                            if (op.animalsPerKg && op.animalsPerKg > 0) {
                              return (1000000 / op.animalsPerKg).toLocaleString('it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3});
                            }
                            
                            // Altrimenti calcola il peso medio da animalCount e totalWeight
                            if (op.animalCount && op.totalWeight && op.animalCount > 0) {
                              const avgWeightMg = (op.totalWeight / op.animalCount) * 1000;
                              console.log(`Calcolo peso medio per operazione ${op.id}: ${op.totalWeight}g / ${op.animalCount} animali * 1000 = ${avgWeightMg}mg`);
                              return avgWeightMg.toLocaleString('it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3});
                            }
                            
                            // Se non abbiamo i dati necessari, mostra '-'
                            return '-';
                          })()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-5 w-5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedOperation(op);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              onClick={() => {
                                setSelectedOperation(op);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      // Duplica l'operazione
                                      const nextDay = addDays(new Date(op.date), 1);
                                      
                                      // Se l'operazione era "prima-attivazione", cambiala in "misura"
                                      const operationType = op.type === 'prima-attivazione' ? 'misura' : op.type;
                                      
                                      const duplicatedOp = {
                                        ...op,
                                        type: operationType,
                                        date: nextDay,
                                        id: undefined // Rimuovi l'ID per creare una nuova operazione
                                      };
                                      
                                      // Memorizza l'ID della cesta per la navigazione post-creazione
                                      const basketId = op.basketId || op.basket?.id;
                                      setRedirectToBasketAfterCreate(basketId);
                                      
                                      setSelectedOperation(duplicatedOp);
                                      setIsCreateDialogOpen(true);
                                    }}
                                  >
                                    <Copy className="h-5 w-5 text-indigo-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplica operazione (rimani sulla stessa cesta)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* Controlli di paginazione per desktop */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-2">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Precedente
                    </Button>
                    <span className="text-sm text-gray-700 mx-4">
                      {currentPage} di {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Successiva
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Visualizzazione <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalOperations)}</span> a <span className="font-medium">{Math.min(currentPage * pageSize, totalOperations)}</span> di{' '}
                        <span className="font-medium">{totalOperations}</span> risultati
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-l-md px-2"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <span className="sr-only">Precedente</span>
                          <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </Button>
                        
                        {/* Pulsanti delle pagine */}
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum;
                          
                          // Logica per mostrare 5 pagine intorno alla pagina corrente
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              className="px-4 hidden md:inline-flex"
                              onClick={() => goToPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-r-md px-2"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          <span className="sr-only">Successiva</span>
                          <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile View (cards) - stile compatto simile ai cicli */}
            <div className="md:hidden">
              {/* Filtri e ordinamento mobile */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex flex-wrap gap-2 mb-2 justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs font-medium flex items-center"
                      onClick={() => {
                        setIsFilterDialogOpen(true);
                      }}
                    >
                      <Filter className="h-3 w-3 mr-1" />
                      Filtri
                    </Button>
                    
                    <Select
                      value={sortConfig.key}
                      onValueChange={(value) => {
                        setSortConfig({
                          key: value,
                          direction: sortConfig.key === value && sortConfig.direction === 'ascending' ? 'descending' : 'ascending'
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs border-dashed">
                        <SelectValue placeholder="Ordina per..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="type">Tipo operazione</SelectItem>
                        <SelectItem value="animalCount">Conteggio</SelectItem>
                        <SelectItem value="lot">Lotto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    size="sm"
                    variant="outline"
                    className="text-xs flex items-center"
                    onClick={() => setSortConfig({
                      ...sortConfig,
                      direction: sortConfig.direction === 'ascending' ? 'descending' : 'ascending'
                    })}
                  >
                    {sortConfig.direction === 'ascending' ? (
                      <>
                        <ArrowUpDown className="h-3 w-3 mr-1" />
                        Crescente
                      </>
                    ) : (
                      <>
                        <ArrowDownUp className="h-3 w-3 mr-1" />
                        Decrescente
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Elenco operazioni (stile simile ai cicli) */}
              <div className="divide-y divide-gray-200">
                {operations && operations.map((op: any) => {
                  // Ottieni informazioni correlate
                  const basket = op.basket || (op.basketId ? baskets?.find((b: any) => b.id === op.basketId) : null);
                  const cycle = op.cycle || (op.cycleId ? cycles?.find((c: any) => c.id === op.cycleId) : null);
                  const lot = op.lot || (op.lotId ? lots?.find((l: any) => l.id === op.lotId) : null);
                  const size = op.size || (op.sizeId ? sizes?.find((s: any) => s.id === op.sizeId) : null);
                  const flupsy = basket?.flupsyId ? flupsys?.find((f: any) => f.id === basket.flupsyId) : null;
                  
                  // Calcola il conteggio degli animali
                  let animalCount = op.animalCount;
                  let animalCountDetails = null;
                  
                  if (!animalCount && op.weight && op.animalsPerKg) {
                    animalCount = Math.round(op.weight * op.animalsPerKg);
                    animalCountDetails = `${op.animalsPerKg.toLocaleString()} per kg × ${op.weight.toLocaleString()} kg`;
                  }
                  
                  // Ottieni classe appropriata per il badge dell'operazione
                  const badgeClass = getOperationTypeBadge(op.type);
                  
                  return (
                    <div key={op.id} className="p-4">
                      <div className="mb-2">
                        <div className="flex justify-between items-start">
                          {/* Data e tipo */}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{format(new Date(op.date), 'dd/MM/yyyy')}</div>
                            <Badge variant="outline" className={`mt-1 ${badgeClass}`}>
                              {getOperationTypeBadge(op.type)}
                            </Badge>
                          </div>
                          
                          {/* Azioni */}
                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedOperation(op);
                                  setIsEditDialogOpen(true);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Modifica
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  const nextDay = addDays(new Date(op.date), 1);
                                  const operationType = op.type === 'prima-attivazione' ? 'misura' : op.type;
                                  const duplicatedOp = {
                                    ...op,
                                    type: operationType,
                                    date: format(nextDay, 'yyyy-MM-dd'),
                                    id: undefined
                                  };
                                  setSelectedOperation(duplicatedOp);
                                  setIsCreateDialogOpen(true);
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplica
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedOperation(op);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Elimina
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                      
                      {/* Informazioni principali */}
                      <div className="bg-gray-50 rounded-md p-3">
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                          {/* Cestello */}
                          <div>
                            <div className="text-xs font-medium text-gray-500">Cesta</div>
                            <div className="font-medium">#{basket?.physicalNumber || op.basketId}</div>
                          </div>
                          
                          {/* Ciclo */}
                          <div>
                            <div className="text-xs font-medium text-gray-500">Ciclo</div>
                            <div className="font-medium">{cycle ? `#${cycle.id}` : '-'}</div>
                          </div>
                          
                          {/* FLUPSY e posizione */}
                          {(flupsy || (basket?.row && basket?.position)) && (
                            <div className="col-span-2 mt-1">
                              {flupsy && (
                                <div className="text-xs text-blue-600">
                                  <MapPin className="h-3 w-3 inline-block mr-1" />
                                  {flupsy.name}
                                </div>
                              )}
                              {basket?.row && basket?.position && (
                                <div className="text-xs text-indigo-600 mt-0.5">
                                  <ArrowRightCircle className="h-3 w-3 inline-block mr-1" />
                                  Posizione: {basket.row} - {basket.position}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Conteggio */}
                          {(animalCount || op.weight || op.animalsPerKg) && (
                            <div className="col-span-2 mt-1 py-1 border-t border-b border-gray-200">
                              <div className="flex items-baseline justify-between">
                                <div className="text-xs font-medium text-gray-500">Conteggio</div>
                                <div className="font-medium text-right">
                                  {animalCount ? (
                                    <span className="text-base text-primary">{parseInt(String(animalCount)).toLocaleString()}</span>
                                  ) : op.weight ? (
                                    <span>{op.weight.toLocaleString()} kg</span>
                                  ) : op.animalsPerKg ? (
                                    <span>{op.animalsPerKg.toLocaleString()} per kg</span>
                                  ) : null}
                                </div>
                              </div>
                              {animalCountDetails && (
                                <div className="text-xs text-gray-500 mt-0.5 text-right">{animalCountDetails}</div>
                              )}
                            </div>
                          )}
                          
                          {/* Lotto */}
                          {lot && (
                            <div className="col-span-2 mt-1">
                              <div className="text-xs font-medium text-gray-500">Lotto</div>
                              <div className="font-medium text-indigo-600">{lot.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')} • {lot.supplier || 'N/D'}
                              </div>
                            </div>
                          )}
                          
                          {/* Taglia */}
                          {size && (
                            <div className="col-span-2">
                              <div className="text-xs font-medium text-gray-500">Taglia</div>
                              <div className="font-medium">{size.name}</div>
                            </div>
                          )}
                          
                          {/* Note */}
                          {op.notes && (
                            <div className="col-span-2 mt-1 pt-1 border-t border-gray-200">
                              <div className="text-xs font-medium text-gray-500">Note</div>
                              <div className="text-sm text-gray-700 italic">{op.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Controlli di paginazione per mobile nella vista tabellare */}
              {totalPages > 1 && (
                <div className="mt-4 p-4 border-t border-gray-200 flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Precedente
                  </Button>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{currentPage}</span> di <span className="font-medium">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Successiva
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Cycles View
          <div className="space-y-4">
            {filteredCycleIds.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                {filters.flupsyFilter !== 'all' ? (
                  <div className="space-y-2">
                    <p className="text-gray-500 font-medium">Nessun ciclo attivo trovato per il FLUPSY selezionato</p>
                    <p className="text-sm text-gray-400">
                      Il FLUPSY "{flupsys?.find(f => f.id.toString() === filters.flupsyFilter)?.name}" 
                      non ha cestelli con cicli attivi al momento.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFlupsyFilter('all')}
                      className="mt-3"
                    >
                      Mostra tutti i FLUPSY con cicli attivi
                    </Button>
                  </div>
                ) : filters.cycleStateFilter === 'active' ? (
                  <div className="space-y-2">
                    <p className="text-gray-500 font-medium">Nessun ciclo attivo trovato</p>
                    <p className="text-sm text-gray-400">
                      Non ci sono cicli attivi al momento. Prova a cambiare i filtri o verifica che ci siano cestelli attivi.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCycleStateFilter('all')}
                      className="mt-3"
                    >
                      Mostra tutti i cicli
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500">Nessun ciclo trovato con i criteri selezionati</p>
                )}
              </div>
            ) : (
              filteredCycleIds.map((cycleId) => {
                const cycle = getCycleDetails(cycleId);
                const basket = baskets?.find((b: any) => b.id === cycle?.basketId);
                const cycleOps = operationsByCycle[cycleId.toString()] || [];
                
                return (
                  <Collapsible 
                    key={cycleId}
                    open={expandedCycles.includes(cycleId)}
                    onOpenChange={() => toggleCycleExpansion(cycleId)}
                    className="bg-white rounded-lg shadow overflow-hidden"
                  >
                    <CollapsibleTrigger asChild>
                      <div className={`p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50
                        ${cycle?.state === 'closed' ? 'bg-gray-50 border-l-4 border-red-500' : ''}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`flex h-10 w-10 rounded-full items-center justify-center
                            ${cycle?.state === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}
                          >
                            {cycle?.state === 'active' ? (
                              <RotateCw className="h-5 w-5" />
                            ) : (
                              <Box className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Ciclo #{cycleId}</h3>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-red-600 font-bold text-lg">Cesta #{basket?.physicalNumber || '?'}</span>
                                {basket?.row && basket?.position && (
                                  <span className="text-indigo-600 ml-1 font-medium">[Pos: {basket.row} - {basket.position}]</span>
                                )}
                                <span className="mx-2">•</span>
                                {cycle?.state === 'active' ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium">Attivo</Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200 font-medium">Chiuso</Badge>
                                )}
                              </p>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                                {/* Prima riga - Informazioni di base */}
                                <div>
                                  <span className="text-gray-500 block text-xs">FLUPSY:</span>
                                  <span className="font-medium text-gray-700">
                                    {(() => {
                                      // Trova il FLUPSY usando l'ID del cestello
                                      if (basket?.flupsyId) {
                                        const flupsy = flupsys?.find((f: any) => f.id === basket.flupsyId);
                                        return flupsy?.name || `FLUPSY #${basket.flupsyId}`;
                                      }
                                      return 'N/D';
                                    })()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs">Lotto:</span>
                                  <span className="font-medium text-gray-700">
                                    {(() => {
                                      // Verifica se c'è un'operazione con lotti multipli
                                      const opWithMultipleLots = cycleOps.find(op => op.hasMultipleLots && op.additionalLots);
                                      if (opWithMultipleLots) {
                                        // Mostra il lotto principale con indicatore di lotto misto e menu a tendina
                                        const mainLot = opWithMultipleLots.lot || 
                                                       (opWithMultipleLots.lotId ? lots?.find(l => l.id === opWithMultipleLots.lotId) : null);
                                        
                                        // Ottieni gli altri lotti da visualizzare nel menu a tendina
                                        const additionalLots = opWithMultipleLots.additionalLots || [];
                                        const additionalLotsCount = Array.isArray(additionalLots) ? additionalLots.length : 0;
                                        
                                        return (
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span>{mainLot ? mainLot.name : 'Lotto principale'}</span>
                                              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                                                Misto
                                              </span>
                                            </div>
                                            
                                            {/* Menu a tendina per gli altri lotti */}
                                            {additionalLotsCount > 0 && (
                                              <details className="mt-1 text-xs">
                                                <summary className="cursor-pointer text-indigo-600 font-medium">
                                                  ▼ Altri lotti ({additionalLotsCount})
                                                </summary>
                                                <div className="pl-2 mt-1 border-l-2 border-indigo-100">
                                                  {additionalLots.map((lotRef: any) => {
                                                    // Cerca i dettagli del lotto
                                                    const lot = lots?.find(l => l.id === lotRef.id || l.id === lotRef.lotId);
                                                    if (!lot) return null;
                                                    
                                                    return (
                                                      <div key={lot.id} className="py-1">
                                                        <div>Arrivo: {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')}</div>
                                                        <div>Fornitore: {lot.supplier || 'N/D'}</div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </details>
                                            )}
                                          </div>
                                        );
                                      }
                                      
                                      // Cerca prima un'operazione di tipo prima-attivazione che abbia un lotto
                                      const firstActivation = cycleOps.find(op => op.type === 'prima-attivazione' && op.lot);
                                      if (firstActivation && firstActivation.lot) {
                                        // Mostra il nome del lotto e informazioni aggiuntive
                                        return (
                                          <div>
                                            <div className="font-medium">{firstActivation.lot.name}</div>
                                            {firstActivation.lot.arrivalDate && (
                                              <div className="text-xs text-gray-500">
                                                Arrivo: {format(new Date(firstActivation.lot.arrivalDate), 'dd/MM/yyyy')}
                                              </div>
                                            )}
                                            {firstActivation.lot.supplier && (
                                              <div className="text-xs text-gray-500">
                                                Fornitore: {firstActivation.lot.supplier}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }

                                      // Se non c'è, cerca un'operazione di tipo prima-attivazione che abbia un lotId
                                      const firstActivationWithLotId = cycleOps.find(op => op.type === 'prima-attivazione' && op.lotId);
                                      if (firstActivationWithLotId && firstActivationWithLotId.lotId) {
                                        const lot = lots?.find(l => l.id === firstActivationWithLotId.lotId);
                                        if (lot) {
                                          return (
                                            <div>
                                              <div className="font-medium">{lot.name || `Lotto #${lot.id}`}</div>
                                              {lot.arrivalDate && (
                                                <div className="text-xs text-gray-500">
                                                  Arrivo: {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')}
                                                </div>
                                              )}
                                              {lot.supplier && (
                                                <div className="text-xs text-gray-500">
                                                  Fornitore: {lot.supplier}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                      }

                                      // Se ancora non c'è, prendi il primo elemento del ciclo che ha un lotto
                                      if (cycleOps.length > 0) {
                                        const opWithLot = cycleOps.find(op => op.lot);
                                        if (opWithLot && opWithLot.lot) {
                                          return (
                                            <div>
                                              <div className="font-medium">{opWithLot.lot.name}</div>
                                              {opWithLot.lot.arrivalDate && (
                                                <div className="text-xs text-gray-500">
                                                  Arrivo: {format(new Date(opWithLot.lot.arrivalDate), 'dd/MM/yyyy')}
                                                </div>
                                              )}
                                              {opWithLot.lot.supplier && (
                                                <div className="text-xs text-gray-500">
                                                  Fornitore: {opWithLot.lot.supplier}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }

                                        // O il primo che ha un lotId
                                        const opWithLotId = cycleOps.find(op => op.lotId);
                                        if (opWithLotId && opWithLotId.lotId) {
                                          const lot = lots?.find(l => l.id === opWithLotId.lotId);
                                          if (lot) {
                                            return (
                                              <div>
                                                <div className="font-medium">{lot.name || `Lotto #${lot.id}`}</div>
                                                {lot.arrivalDate && (
                                                  <div className="text-xs text-gray-500">
                                                    Arrivo: {format(new Date(lot.arrivalDate), 'dd/MM/yyyy')}
                                                  </div>
                                                )}
                                                {lot.supplier && (
                                                  <div className="text-xs text-gray-500">
                                                    Fornitore: {lot.supplier}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          }
                                        }
                                      }

                                      // Se proprio non si trova niente
                                      return 'N/D';
                                    })()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500 block text-xs">Inizio:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycle && format(new Date(cycle.startDate), 'dd/MM/yyyy')}
                                  </span>
                                </div>
                                <div>
                                  {cycle && cycle.endDate ? (
                                    <>
                                      <span className="text-gray-500 block text-xs">Fine:</span>
                                      <span className="font-medium text-gray-700">
                                        {format(new Date(cycle.endDate), 'dd/MM/yyyy')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-gray-500 block text-xs">Ultima operazione:</span>
                                      <span className="font-medium text-gray-700">
                                        {cycleOps.length > 0 ? format(new Date(cycleOps[cycleOps.length - 1].date), 'dd/MM/yyyy') : 'N/D'}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                {/* Seconda riga - Durata */}
                                <div className="col-span-4">
                                  <span className="text-gray-500 block text-xs">Durata:</span>
                                  <div className="font-medium text-gray-700 flex items-center mt-1">
                                    {cycle && (() => {
                                      const startDate = new Date(cycle.startDate);
                                      const endDate = cycle.endDate ? new Date(cycle.endDate) : new Date();
                                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      // Crea una mini-sparkline con CSS per rappresentare la durata
                                      const maxDays = 120; // Durata massima prevista per un ciclo
                                      const percentage = Math.min(diffDays / maxDays * 100, 100);
                                      
                                      return (
                                        <>
                                          <span className="mr-2 font-semibold">{diffDays} giorni{cycle.endDate ? '' : ' (in corso)'}</span>
                                          <div className="h-2.5 bg-gray-200 rounded-full w-full flex-grow">
                                            <div 
                                              className={`h-full rounded-full ${
                                                percentage < 30 ? 'bg-blue-400' : 
                                                percentage < 60 ? 'bg-green-400' : 
                                                percentage < 90 ? 'bg-yellow-400' : 'bg-red-400'
                                              }`}
                                              style={{ width: `${percentage}%` }}
                                            />
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                                
                                {/* Terza riga - Taglie e animali */}
                                <div>
                                  <span className="text-gray-500 block text-xs">Taglia iniziale:</span>
                                  <div className="font-medium text-gray-700 flex items-center">
                                    {cycleOps.length > 0 && (
                                      <>
                                        {cycleOps[0].size ? (
                                          <span className="mr-1">{cycleOps[0].size.code}</span>
                                        ) : cycleOps[0].sizeId ? (
                                          <span className="mr-1">{sizes?.find((s: any) => s.id === cycleOps[0].sizeId)?.code || `Size #${cycleOps[0].sizeId}`}</span>
                                        ) : cycleOps[0].animalsPerKg ? (
                                          <span className="mr-1">{determineSizeFromAnimalsPerKg(parseFloat(cycleOps[0].animalsPerKg))?.code || 'Calcolata'}</span>
                                        ) : (
                                          <span className="mr-1">N/D</span>
                                        )}
                                        
                                        {cycleOps[0].animalsPerKg && (
                                          <>
                                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {formatNumberWithCommas(cycleOps[0].averageWeight, 3)} mg
                                            </span>
                                            <span className="text-xs ml-1 text-gray-500">
                                              ({parseFloat(cycleOps[0].animalsPerKg).toLocaleString()} an/kg)
                                            </span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Taglia attuale:</span>
                                  <div className="font-medium text-gray-700 flex items-center">
                                    {cycleOps.length > 0 && (
                                      <>
                                        {cycleOps[cycleOps.length - 1].size ? (
                                          <span className="mr-1">{cycleOps[cycleOps.length - 1].size.code}</span>
                                        ) : cycleOps[cycleOps.length - 1].sizeId ? (
                                          <span className="mr-1">{sizes?.find((s: any) => s.id === cycleOps[cycleOps.length - 1].sizeId)?.code || `Size #${cycleOps[cycleOps.length - 1].sizeId}`}</span>
                                        ) : cycleOps[cycleOps.length - 1].animalsPerKg ? (
                                          <span className="mr-1">{determineSizeFromAnimalsPerKg(parseFloat(cycleOps[cycleOps.length - 1].animalsPerKg))?.code || 'Calcolata'}</span>
                                        ) : (
                                          <span className="mr-1">N/D</span>
                                        )}
                                        
                                        {cycleOps[cycleOps.length - 1].animalsPerKg && (
                                          <>
                                            <span className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                              {parseFloat(cycleOps[cycleOps.length - 1].averageWeight).toFixed(2)} mg
                                            </span>
                                            <span className="text-xs ml-1 text-gray-500">
                                              ({parseFloat(cycleOps[cycleOps.length - 1].animalsPerKg).toLocaleString()} an/kg)
                                            </span>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Animali:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].animalCount 
                                      ? cycleOps[cycleOps.length - 1].animalCount.toLocaleString() 
                                      : 'N/D'}
                                  </span>
                                </div>
                                
                                <div>
                                  <span className="text-gray-500 block text-xs">Peso totale:</span>
                                  <span className="font-medium text-gray-700">
                                    {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].totalWeight 
                                      ? `${parseFloat(cycleOps[cycleOps.length - 1].totalWeight).toLocaleString()} g`
                                      : 'N/D'}
                                  </span>
                                </div>
                                
                                {/* Quarta riga - Performance di crescita */}
                                <div className="col-span-4">
                                  {cycleOps.length >= 2 && (() => {
                                    const firstOp = cycleOps[0];
                                    const lastOp = cycleOps[cycleOps.length - 1];
                                    
                                    if (firstOp.animalsPerKg && lastOp.animalsPerKg) {
                                      const firstWeight = parseFloat(firstOp.averageWeight);
                                      const lastWeight = parseFloat(lastOp.averageWeight);
                                      const weightGain = lastWeight - firstWeight;
                                      const percentGain = ((lastWeight - firstWeight) / firstWeight) * 100;
                                      
                                      const startDate = new Date(firstOp.date);
                                      const endDate = new Date(lastOp.date);
                                      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      
                                      const dailyGainPercent = percentGain / diffDays;
                                      
                                      let performanceClass = 'text-gray-700';
                                      let bgClass = 'bg-gray-50';
                                      if (dailyGainPercent >= 3) {
                                        performanceClass = 'text-emerald-700';
                                        bgClass = 'bg-emerald-50';
                                      }
                                      else if (dailyGainPercent >= 2) {
                                        performanceClass = 'text-emerald-600';
                                        bgClass = 'bg-emerald-50';
                                      }
                                      else if (dailyGainPercent >= 1) {
                                        performanceClass = 'text-yellow-600';
                                        bgClass = 'bg-yellow-50';
                                      }
                                      else if (dailyGainPercent > 0) {
                                        performanceClass = 'text-orange-500';
                                        bgClass = 'bg-orange-50';
                                      }
                                      else {
                                        performanceClass = 'text-red-500';
                                        bgClass = 'bg-red-50';
                                      }
                                      
                                      return (
                                        <div className={`${bgClass} p-2 rounded-md mt-1`}>
                                          <div className="flex items-center justify-between">
                                            <span className="font-medium">Performance di crescita</span>
                                            <div className={`font-semibold ${performanceClass}`}>
                                              {percentGain.toFixed(1)}% totale
                                            </div>
                                          </div>
                                          <div className="flex justify-between text-sm mt-1">
                                            <span className="text-gray-500">
                                              Periodo: {format(startDate, 'dd/MM')} - {format(endDate, 'dd/MM')} ({diffDays} giorni)
                                            </span>
                                            <span className={`${performanceClass} font-medium`}>
                                              {dailyGainPercent.toFixed(2)}% al giorno
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                </div>
                                
                                {/* Quinta riga - Proiezione verso TP-3000 */}
                                <div className="col-span-4">
                                  {cycleOps.length > 0 && cycleOps[cycleOps.length - 1].animalsPerKg && (() => {
                                    // Ottieni il peso attuale dall'ultimo dato registrato
                                    const currentWeight = parseFloat(cycleOps[cycleOps.length - 1].averageWeight);
                                    
                                    // Verifica se la taglia corrente è già TP-3000 (dal codice della taglia)
                                    const currentSizeCode = cycleOps[cycleOps.length - 1].size?.code || '';
                                    
                                    // TP-3000 significa un range da 19.001 a 32.000 animali/kg
                                    // Utilizziamo 32.000 come valore di riferimento (limite inferiore della categoria TP-3000)
                                    // poiché rappresenta il valore minimo per entrare nella categoria
                                    const targetWeight = 1000000 / 32000; // ~ 31,25 mg
                                    
                                    // Se il peso attuale è già superiore al target o la taglia è già TP-3000, non mostrare la proiezione
                                    if (currentWeight >= targetWeight || currentSizeCode === 'TP-3000' || currentSizeCode?.startsWith('TP-') && parseInt(currentSizeCode.replace('TP-', '')) >= 3000) {
                                      // Determina se la taglia è stata anche superata
                                      const isSizeExceeded = currentSizeCode && currentSizeCode !== 'TP-3000' && 
                                        currentSizeCode.startsWith('TP-') && 
                                        parseInt(currentSizeCode.replace('TP-', '')) > 3000;
                                      
                                      return (
                                        <div className="bg-emerald-50 p-2 rounded-md mt-1">
                                          <div className="text-emerald-600 flex items-center">
                                            <Check className="h-4 w-4 mr-2" />
                                            <span className="font-medium">
                                              Taglia TP-3000 già raggiunta{isSizeExceeded ? ' e superata' : ''}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    }
                                    
                                    // Calcola i giorni necessari per raggiungere il target
                                    const now = new Date();
                                    
                                    // Utilizziamo un calcolo più preciso che tiene conto dei tassi SGR variabili per mese
                                    let daysNeeded = 0;
                                    let simulatedWeight = currentWeight;
                                    let simulationDate = new Date(); // Data attuale
                                    
                                    // Assicuriamoci che abbiamo i dati SGR
                                    if (sgrs && sgrs.length > 0) {
                                      // Simuliamo fino a quando non raggiungiamo il peso target o un anno di simulazione
                                      while (simulatedWeight < targetWeight && daysNeeded < 365) {
                                        // Ottieni il mese corrente per la data di simulazione
                                        const simMonth = format(simulationDate, 'MMMM', { locale: it }).toLowerCase();
                                        
                                        // Trova l'SGR per questo mese
                                        const monthSgr = sgrs.find((sgr: any) => sgr.month.toLowerCase() === simMonth);
                                        let dailyGrowthRate = 1.0; // Valore predefinito
                                        
                                        if (monthSgr) {
                                          dailyGrowthRate = monthSgr.percentage; // Usa il valore percentuale direttamente
                                        }
                                        
                                        // Versione corretta che applica l'incremento giornaliero: W1 = W0 * (1 + (SGR/100))
                                        // dailyGrowthRate è in forma percentuale (es. 3.7 per 3.7%)
                                        simulatedWeight = simulatedWeight * (1 + (dailyGrowthRate / 100));
                                        
                                        // Incrementa la data di simulazione di un giorno
                                        simulationDate = addDays(simulationDate, 1);
                                        daysNeeded++;
                                      }
                                    } else {
                                      // Fallback se non ci sono dati SGR: usa un tasso fisso di crescita
                                      const fixedDailyRate = 3.7; // 3.7% al giorno
                                      // Formula logaritmica corretta: t = ln(W_t/W_0) / (SGR/100)
                                      daysNeeded = Math.ceil(Math.log(targetWeight / currentWeight) / (fixedDailyRate/100));
                                    }
                                    
                                    // Calcola la data stimata di raggiungimento
                                    const targetDate = addDays(now, daysNeeded);
                                    
                                    // Percentuale completata verso l'obiettivo
                                    const progressPercentage = (currentWeight / targetWeight) * 100;
                                    
                                    return (
                                      <div className="bg-blue-50 p-2 rounded-md mt-1">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-blue-700 font-medium">Verso TP-3000</span>
                                          <div className="flex items-center">
                                            <span className="text-sm font-medium">{Math.round(progressPercentage)}%</span>
                                            <span className="text-sm text-gray-500 ml-2">
                                              {daysNeeded} giorni rimanenti
                                            </span>
                                          </div>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full">
                                          <div 
                                            className="h-full rounded-full bg-blue-500"
                                            style={{ width: `${progressPercentage}%` }}
                                          />
                                        </div>
                                        <div className="text-right text-xs mt-1 text-gray-500">
                                          <span>Data stimata: {format(targetDate, 'dd/MM/yyyy')}</span>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                

                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Aggiungiamo qui il conteggio degli animali in modo prominente */}
                          {(() => {
                            // Otteniamo l'ultima operazione per avere il conteggio aggiornato
                            const lastOp = cycleOps.length > 0 ? cycleOps[cycleOps.length - 1] : null;
                            
                            // Se abbiamo un'ultima operazione con dati sugli animali
                            if (lastOp && lastOp.animalsPerKg && lastOp.animalCount) {
                              return (
                                <div className="flex flex-col items-center mr-3 border rounded-lg p-2 bg-blue-50">
                                  <span className="text-xs text-gray-500 uppercase font-semibold">Animali</span>
                                  <span className="text-lg font-bold text-blue-700">{lastOp.animalCount.toLocaleString()}</span>
                                </div>
                              );
                            } else if (lastOp && lastOp.animalsPerKg) {
                              // Se non abbiamo il conteggio diretto ma abbiamo animali per kg e peso totale
                              // Verifichiamo se abbiamo il peso totale in kg o grammi
                              let totalAnimals = 0;
                              if (lastOp.totalWeightKg) {
                                totalAnimals = Math.round(lastOp.totalWeightKg * lastOp.animalsPerKg);
                              } else if (lastOp.totalWeight) {
                                // Converto grammi in kg se totalWeight è in grammi
                                totalAnimals = Math.round((lastOp.totalWeight / 1000) * lastOp.animalsPerKg);
                              }
                              if (totalAnimals > 0) {
                                return (
                                  <div className="flex flex-col items-center mr-3 border rounded-lg p-2 bg-blue-50">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Animali</span>
                                    <span className="text-lg font-bold text-blue-700">{totalAnimals.toLocaleString()}</span>
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                          
                          <Badge className="mr-2">
                            {cycleOps.length} operazioni
                          </Badge>
                          {expandedCycles.includes(cycleId) ? (
                            <ArrowUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ArrowDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Separator />
                      <div className="p-4 space-y-2">
                        {cycleOps.map((op: any, index: number) => {
                          // Find previous operation to calculate growth
                          const prevOp = index > 0 ? cycleOps[index - 1] : null;
                          
                          // Calcola il cambio di peso e i giorni tra le operazioni
                          const prevWeight = prevOp && prevOp.averageWeight ? parseFloat(prevOp.averageWeight) : null;
                          const currWeight = op.averageWeight ? parseFloat(op.averageWeight) : null;
                          const weightChange = prevWeight && currWeight ? Math.round(currWeight - prevWeight) : null;
                          
                          const prevDate = prevOp ? new Date(prevOp.date) : null;
                          const currDate = new Date(op.date);
                          const daysDiff = prevDate ? Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          
                          // Calcola la crescita percentuale attuale
                          const actualGrowthPercent = prevWeight && currWeight && prevWeight > 0 ? 
                            ((currWeight - prevWeight) / prevWeight) * 100 : null;
                          
                          // Calcola la crescita teorica basata sull'SGR
                          const theoreticalGrowth = prevDate && daysDiff ? 
                            calculateTheoreticalGrowth(prevDate, daysDiff) : null;
                          
                          const targetGrowthPercent = theoreticalGrowth ? 
                            theoreticalGrowth.theoreticalGrowthPercent : null;
                          
                          return (
                            <Card key={op.id} className={`border-l-4 ${index === 0 ? 'border-l-purple-500' : op.type.includes('vendita') ? 'border-l-green-500' : 'border-l-blue-500'}`}>
                              <CardHeader className="py-3 px-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center space-x-3">
                                    <div>
                                      <h4 className="text-base font-medium flex items-center">
                                        {getOperationTypeBadge(op.type)}
                                        <span className="ml-2 text-gray-600">
                                          {format(new Date(op.date), 'dd/MM/yyyy')}
                                        </span>
                                      </h4>
                                      {daysDiff && daysDiff > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {daysDiff} {daysDiff === 1 ? 'giorno' : 'giorni'} dall'ultima operazione
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedOperation(op);
                                        setIsEditDialogOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-gray-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-600 hover:text-red-800 hover:bg-red-100"
                                      onClick={() => {
                                        setSelectedOperation(op);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              // Duplica l'operazione
                                              const nextDay = addDays(new Date(op.date), 1);
                                              const operationType = op.type === 'prima-attivazione' ? 'misura' : op.type;
                                              
                                              const duplicatedOp = {
                                                ...op,
                                                type: operationType,
                                                date: nextDay,
                                                id: undefined
                                              };
                                              
                                              setSelectedOperation(duplicatedOp);
                                              // Imposta lo stato per il reindirizzamento dopo la creazione
                                              setRedirectToBasketAfterCreate(op.basketId);
                                              setIsCreateDialogOpen(true);
                                            }}
                                          >
                                            <Copy className="h-4 w-4 text-indigo-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Duplica questa operazione e visualizza la cesta</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="py-2 px-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  {op.animalsPerKg && (
                                    <div>
                                      <p className="text-gray-500">Taglia</p>
                                      <div className="flex items-center">
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${op.size?.color ? `bg-opacity-20 bg-${op.size.color.replace('#', '')}` : 'bg-gray-100'}`}>
                                          {op.size?.code || 'N/D'}
                                        </span>
                                        <span className="ml-2">{parseFloat(op.averageWeight).toLocaleString('it-IT', {minimumFractionDigits: 3, maximumFractionDigits: 3})} mg</span>
                                        <span className="ml-2 text-xs text-gray-500">({op.animalsPerKg.toLocaleString()} an/kg)</span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {weightChange && (
                                    <div>
                                      <p className="text-gray-500">Crescita</p>
                                      <p className={weightChange > 0 ? 'text-emerald-600' : weightChange < 0 ? 'text-red-500' : 'text-gray-600'}>
                                        {weightChange > 0 ? '+' : ''}{weightChange} mg
                                        {daysDiff && <span className="text-xs ml-1">
                                          ({(weightChange / daysDiff).toFixed(1)} mg/g)
                                        </span>}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {op.animalCount && (
                                    <div>
                                      <p className="text-gray-500">Animali</p>
                                      <p>{op.animalCount.toLocaleString()}</p>
                                    </div>
                                  )}
                                  
                                  {op.totalWeight && (
                                    <div>
                                      <p className="text-gray-500">Peso totale</p>
                                      <p>{op.totalWeight.toLocaleString()} g</p>
                                    </div>
                                  )}
                                  
                                  {/* Mostra sempre la sezione Lotto, con un placeholder se non esiste */}
                                  <div>
                                    <p className="text-gray-500">Lotto</p>
                                    {op.lot ? (
                                      <p className="font-medium text-indigo-600">
                                        {op.lot.name}
                                        <span className="text-xs text-gray-500 block">
                                          Arrivo: {format(new Date(op.lot.arrivalDate), 'dd/MM/yyyy')}
                                        </span>
                                        <span className="text-xs text-gray-500 block">
                                          Fornitore: {op.lot.supplier || 'N/D'}
                                        </span>
                                      </p>
                                    ) : (
                                      <p className="text-gray-400 italic">Nessun lotto</p>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Visualizza l'indicatore di performance di crescita per le operazioni di misura e peso */}
                                {index > 0 && (op.type === 'misura' || op.type === 'peso') && prevWeight && currWeight && actualGrowthPercent !== null && theoreticalGrowth && (
                                  <div className="mt-4">
                                    <p className="text-gray-500 text-sm font-medium mb-1">Performance di crescita</p>
                                    <GrowthPerformanceIndicator
                                      actualGrowthPercent={actualGrowthPercent}
                                      targetGrowthPercent={targetGrowthPercent}
                                      daysBetweenMeasurements={daysDiff || 0}
                                      currentAverageWeight={currWeight}
                                      previousAverageWeight={prevWeight}
                                      sgrMonth={theoreticalGrowth?.sgrMonth}
                                      sgrDailyPercentage={theoreticalGrowth?.sgrDailyPercentage}
                                    />
                                  </div>
                                )}
                                
                                {op.notes && (
                                  <div className="mt-3 text-sm">
                                    <p className="text-gray-500">Note</p>
                                    <p>{op.notes}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        )
      )}

      {/* Create Operation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        // Quando si chiude il dialog, resetta l'operazione selezionata
        if (!open) {
          setSelectedOperation(null);
        }
        setIsCreateDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" aria-describedby="operation-form-description">
          <DialogHeader>
            <DialogTitle>
              {selectedOperation ? "Duplica Operazione" : "Registra Nuova Operazione"}
            </DialogTitle>
            <DialogDescription id="operation-form-description">
              {selectedOperation 
                ? "Modifica i dati dell'operazione duplicata prima di registrarla" 
                : "Compila il modulo per registrare una nuova operazione"}
            </DialogDescription>
          </DialogHeader>
          <OperationForm 
            onSubmit={(data) => {
              console.log('Dialog - Submitting operation data:', data);
              
              // Assicurati che i campi numerici siano effettivamente numeri
              const formattedData = {
                ...data,
                animalCount: data.animalCount ? Number(data.animalCount) : null,
                animalsPerKg: data.animalsPerKg ? Number(data.animalsPerKg) : null,
                totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
                date: data.date instanceof Date ? data.date : new Date(data.date),
                // Assicuriamoci che le note siano salvate correttamente anche per nuove operazioni
                notes: data.notes || null
              };
              
              console.log('Formatted operation data:', formattedData);
              createOperationMutation.mutate(formattedData);
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createOperationMutation.isPending}
            isDuplication={!!selectedOperation}
            initialCycleId={selectedOperation ? null : initialCycleId}
            initialFlupsyId={selectedOperation ? null : initialFlupsyId}
            initialBasketId={selectedOperation ? null : initialBasketId}
            defaultValues={selectedOperation ? {
              type: selectedOperation.type,
              date: new Date(), // Propone sempre la data odierna quando si duplica un'operazione
              basketId: selectedOperation.basketId,
              cycleId: selectedOperation.cycleId,
              flupsyId: (() => {
                // Trova il FLUPSY ID dal cestello nell'operazione o cerca tra i cestelli disponibili
                if (selectedOperation.basket?.flupsyId) {
                  return selectedOperation.basket.flupsyId;
                }
                if (selectedOperation.flupsyId) {
                  return selectedOperation.flupsyId;
                }
                // Fallback: cerca il cestello tra quelli disponibili
                const basket = baskets?.find((b: any) => b.id === selectedOperation.basketId);
                return basket?.flupsyId || null;
              })(),
              sizeId: selectedOperation.sizeId,
              sgrId: selectedOperation.sgrId,
              lotId: selectedOperation.lotId,
              animalCount: selectedOperation.animalCount,
              totalWeight: selectedOperation.totalWeight,
              animalsPerKg: selectedOperation.animalsPerKg,
              notes: selectedOperation.notes || ''
            } : undefined}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Operation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Operazione</DialogTitle>
          </DialogHeader>
          {selectedOperation && (
            <OperationForm 
              onSubmit={(data) => {
                console.log('Edit dialog - Submitting operation data:', data);
                
                // Assicurati che i campi numerici siano effettivamente numeri
                const formattedData = {
                  ...data,
                  animalCount: data.animalCount ? Number(data.animalCount) : null,
                  animalsPerKg: data.animalsPerKg ? Number(data.animalsPerKg) : null,
                  totalWeight: data.totalWeight ? Number(data.totalWeight) : null,
                  date: data.date instanceof Date ? data.date : new Date(data.date),
                  // Assicuriamoci che notes sia salvato correttamente
                  notes: data.notes || null
                };
                
                console.log('Formatted operation data:', formattedData);
                updateOperationMutation.mutate({ id: selectedOperation.id, operation: formattedData });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={updateOperationMutation.isPending}
              defaultValues={{
                type: selectedOperation.type,
                date: new Date(selectedOperation.date),
                basketId: selectedOperation.basketId,
                cycleId: selectedOperation.cycleId,
                flupsyId: selectedOperation.basket?.flupsyId || selectedOperation.flupsyId,
                sizeId: selectedOperation.sizeId,
                sgrId: selectedOperation.sgrId,
                lotId: selectedOperation.lotId,
                animalCount: selectedOperation.animalCount,
                totalWeight: selectedOperation.totalWeight,
                animalsPerKg: selectedOperation.animalsPerKg,
                notes: selectedOperation.notes || ''
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Operation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Elimina Operazione</DialogTitle>
            <DialogDescription className="text-destructive-foreground/80">
              Sei sicuro di voler eliminare questa operazione? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          {selectedOperation && (
            <div className="p-4 my-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(selectedOperation.date), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipologia</p>
                  <p className="font-medium">
                    {selectedOperation.type
                      .split('-')
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cesta</p>
                  <p className="font-medium">
                    #{baskets?.find((b: any) => b.id === selectedOperation.basketId)?.physicalNumber || selectedOperation.basketId}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ciclo</p>
                  <p className="font-medium">#{selectedOperation.cycleId}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedOperation && selectedOperation.type === 'prima-attivazione') {
                  // Se l'operazione è di tipo prima-attivazione, mostra il dialogo specifico
                  setIsDeletePrimaAttivazioneDialogOpen(true);
                  setIsDeleteDialogOpen(false); // Chiude il dialogo standard
                } else {
                  // Altrimenti procedi con l'eliminazione
                  selectedOperation && deleteOperationMutation.mutate(selectedOperation.id);
                }
              }}
              disabled={deleteOperationMutation.isPending}
            >
              {deleteOperationMutation.isPending ? "Eliminazione in corso..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialogo di conferma per eliminazione operazioni di PRIMA ATTIVAZIONE */}
      <AlertDialog 
        open={isDeletePrimaAttivazioneDialogOpen} 
        onOpenChange={setIsDeletePrimaAttivazioneDialogOpen}
      >
        <AlertDialogContent className="max-w-[600px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Attenzione: operazione distruttiva
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-2">
                  <div className="font-semibold text-red-700">Questa è un'operazione di Prima Attivazione!</div>
                  <div className="text-red-600 mt-1">
                    L'eliminazione di questa operazione comporterà:
                  </div>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-red-700">
                    <li>La cancellazione del ciclo associato alla cesta</li>
                    <li>L'eliminazione di tutte le operazioni correlate a questo ciclo</li>
                    <li>La pulizia degli storici delle posizioni della cesta</li>
                    <li>Il ripristino della cesta allo stato "disponibile"</li>
                  </ul>
                  <div className="font-medium text-red-600 mt-3">Questa azione è irreversibile!</div>
                </div>
                <div>
                  Sei sicuro di voler eliminare definitivamente questa operazione di Prima Attivazione
                  {selectedOperation && selectedOperation.basket ? ` per la cesta #${selectedOperation.basket.physicalNumber}` : ''}?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeletePrimaAttivazioneDialogOpen(false);
            }}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (selectedOperation) {
                  deleteOperationMutation.mutate(selectedOperation.id);
                  setIsDeletePrimaAttivazioneDialogOpen(false);
                }
              }}
              disabled={deleteOperationMutation.isPending}
            >
              {deleteOperationMutation.isPending ? 
                "Eliminazione in corso..." : 
                "Sì, elimina definitivamente"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
