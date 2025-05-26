import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Eye, Copy, Download, Plus, Filter, Upload, Pencil, Search, Waves,
  Trash2, AlertTriangle, History, MapPin, Info
} from 'lucide-react';
import { getSizeBadgeStyle, getSizeColor } from '@/lib/sizeUtils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BasketForm from '@/components/BasketForm';
import NFCReader from '@/components/NFCReader';
import BasketPositionHistory from '@/components/BasketPositionHistory';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export default function Baskets() {
  // Utilizziamo il hook di persistenza per i filtri
  const [filters, setFilters] = useFilterPersistence('baskets', {
    searchTerm: '',
    stateFilter: 'all',
    flupsyFilter: 'all',
    sortConfig: {
      key: 'size.code',
      direction: 'asc' as 'asc' | 'desc'
    }
  });

  // Stato preferredSize viene mantenuto separato poiché era già salvato nel localStorage
  const [preferredSize, setPreferredSize] = useState(localStorage.getItem('preferredSizeCode') || 'TP-500');

  // Utilizzo dei filtri salvati
  const searchTerm = filters.searchTerm;
  const stateFilter = filters.stateFilter;
  const flupsyFilter = filters.flupsyFilter;
  const sortConfig = filters.sortConfig as {key: string, direction: 'asc' | 'desc'};

  // Funzioni per aggiornare i filtri
  const setSearchTerm = (value: string) => setFilters(prev => ({ ...prev, searchTerm: value }));
  const setStateFilter = (value: string) => setFilters(prev => ({ ...prev, stateFilter: value }));
  const setFlupsyFilter = (value: string) => setFilters(prev => ({ ...prev, flupsyFilter: value }));
  const setSortConfig = (value: {key: string, direction: 'asc' | 'desc'}) => 
    setFilters(prev => ({ ...prev, sortConfig: value }));

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBasket, setSelectedBasket] = useState<any>(null);
  const [location] = useLocation();
  const [urlParamsLoaded, setUrlParamsLoaded] = useState(false);

  // Salva la taglia preferita nel localStorage ogni volta che cambia
  useEffect(() => {
    localStorage.setItem('preferredSizeCode', preferredSize);
    // Quando cambia la taglia preferita, aggiorna automaticamente l'ordinamento
    if (preferredSize) {
      setSortConfig({
        key: 'size.code',
        direction: 'asc'
      });
    }
  }, [preferredSize]);

  // Carica il flupsyId dal localStorage (impostato dalla pagina Flupsys)
  useEffect(() => {
    const savedFlupsyId = localStorage.getItem('selectedFlupsyId');

    if (savedFlupsyId) {
      console.log("Impostazione filtro FLUPSY da localStorage:", savedFlupsyId);
      setFlupsyFilter(savedFlupsyId);
      // Rimuovi l'ID dopo averlo utilizzato per evitare che persista tra le navigazioni
      localStorage.removeItem('selectedFlupsyId');
    } else {
      // Analizza i parametri dell'URL come fallback
      const params = new URLSearchParams(location.split('?')[1] || '');
      const flupsyIdParam = params.get('flupsyId');

      if (flupsyIdParam) {
        console.log("Impostazione filtro FLUPSY da URL:", flupsyIdParam);
        setFlupsyFilter(flupsyIdParam);
      }
    }
  }, [location]);

  // Query baskets
  const { data: baskets, isLoading } = useQuery({
    queryKey: ['/api/baskets'],
  });

  // Query FLUPSY units for filter
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  }) as { data: any[] };

  // Query operations for calculating missing data
  const { data: operations = [] } = useQuery({
    queryKey: ['/api/operations?includeAll=true&pageSize=1000'],
  });

  // Query sizes for size calculation
  const { data: sizes = [] } = useQuery({
    queryKey: ['/api/sizes'],
  });

  // Create mutation
  const createBasketMutation = useMutation({
    mutationFn: (newBasket: any) => apiRequest({
      url: '/api/baskets',
      method: 'POST', 
      body: newBasket
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Operazione completata",
        description: "La cesta è stata creata con successo",
        variant: "success",
      });
    },
    onError: (error: any) => {
      // Gestione errori migliorata per messaggi specifici
      let errorMessage = "Si è verificato un errore durante la creazione della cesta";
      let errorTitle = "Errore";

      // Estrai il messaggio di errore JSON se presente
      if (error.message) {
        try {
          // Se il messaggio contiene JSON (come "400: {"message":"La posizione DX-1 è già occupata..."}")
          if (error.message.includes('{')) {
            const jsonPart = error.message.substring(error.message.indexOf('{'));
            const parsedError = JSON.parse(jsonPart);

            if (parsedError.message) {
              errorMessage = parsedError.message;

              // Titoli specifici in base al tipo di errore
              if (errorMessage.includes("posizione") && errorMessage.includes("occupata")) {
                errorTitle = "Posizione già occupata";
              } else if (errorMessage.includes("Esiste già una cesta")) {
                errorTitle = "Numero cesta duplicato";
              }
            }
          } else {
            errorMessage = error.message;
          }
        } catch (e) {
          // Se il parsing fallisce, usa il messaggio originale
          errorMessage = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  // Update mutation
  const updateBasketMutation = useMutation({
    mutationFn: (data: any) => apiRequest({
      url: `/api/baskets/${data.id}`,
      method: 'PATCH',
      body: data.basket
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      setIsEditDialogOpen(false);
      setSelectedBasket(null);
      toast({
        title: "Operazione completata",
        description: "La cesta è stata aggiornata con successo",
        variant: "success",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'aggiornamento della cesta",
        variant: "destructive",
      });
    }
  });

  // Delete mutation
  const deleteBasketMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/baskets/${id}`,
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      setIsDeleteDialogOpen(false);
      setSelectedBasket(null);
      toast({
        title: "Operazione completata",
        description: "La cesta è stata eliminata con successo",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante l'eliminazione della cesta",
        variant: "destructive",
      });
    }
  });

  // Funzione per calcolare la taglia basandosi sugli animali per kg
  const getSizeCodeFromAnimalsPerKg = (animalsPerKg: number): string => {
    if (!sizes || !Array.isArray(sizes) || !animalsPerKg) return 'N/D';
    
    // Trova la taglia corrispondente in base al range min_animals_per_kg e max_animals_per_kg
    const matchingSize = sizes.find((size: any) => {
      return (
        (!size.minAnimalsPerKg || animalsPerKg >= size.minAnimalsPerKg) &&
        (!size.maxAnimalsPerKg || animalsPerKg <= size.maxAnimalsPerKg)
      );
    });
    
    if (matchingSize) {
      return matchingSize.code;
    }
    
    // Fallback se non troviamo una taglia corrispondente
    return `TP-${Math.round(animalsPerKg/1000)*1000}`;
  };

  // Funzione per calcolare i dati aggiuntivi basandosi sulle operazioni
  const calculateBasketData = (basket: any) => {
    if (!operations || !Array.isArray(operations)) {
      return {
        ...basket,
        calculatedSize: null,
        calculatedAnimalCount: null,
        activationDate: null,
        lotId: null
      };
    }

    // Trova tutte le operazioni per questo cestello, ordinate per data (più recente prima)
    const basketOperations = operations
      .filter(op => op.basketId === basket.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (basketOperations.length === 0) {
      return {
        ...basket,
        calculatedSize: null,
        calculatedAnimalCount: null,
        activationDate: null,
        lotId: null
      };
    }

    // Prendi l'operazione più recente per i dati principali
    const latestOperation = basketOperations[0];
    
    // Calcola la taglia se abbiamo peso e numero animali
    let calculatedSize = null;
    if (latestOperation.weight && latestOperation.animalCount) {
      const animalsPerKg = latestOperation.animalCount / latestOperation.weight;
      calculatedSize = getSizeCodeFromAnimalsPerKg(animalsPerKg);
    }

    // Data di attivazione: prima operazione
    const firstOperation = basketOperations[basketOperations.length - 1];
    const activationDate = firstOperation?.date || null;

    return {
      ...basket,
      calculatedSize,
      calculatedAnimalCount: latestOperation.animalCount || null,
      activationDate,
      lotId: latestOperation.lotId || null,
      lastOperationDate: latestOperation.date,
      lastOperationType: latestOperation.type
    };
  };

  // Prepare baskets array with additional data
  const basketsArray = Array.isArray(baskets) ? baskets.map(calculateBasketData) : [];
  const flupsysArray = Array.isArray(flupsys) ? flupsys : [];

  // Debug - controlla quanti cestelli hanno la taglia impostata
  useEffect(() => {
    if (basketsArray.length > 0) {
      const basketsWithSize = basketsArray.filter(basket => basket.size && basket.size.code);
      const basketsWithoutSize = basketsArray.filter(basket => !basket.size || !basket.size.code);

      console.log(`Cestelli con taglia: ${basketsWithSize.length}/${basketsArray.length}`);
      console.log(`Cestelli senza taglia: ${basketsWithoutSize.length}/${basketsArray.length}`);

      if (basketsWithoutSize.length > 0) {
        console.log('Esempio cestello senza taglia:', basketsWithoutSize[0]);
      }

      if (basketsWithSize.length > 0) {
        console.log('Esempio cestello con taglia:', basketsWithSize[0]);
      }
    }
  }, [basketsArray]);

  // Funzione che calcola la differenza numerica tra due taglie (per ordinamento per somiglianza)
  const getSizeNumberFromCode = (sizeCode: string | undefined): number => {
    if (!sizeCode || !sizeCode.startsWith('TP-')) return 0;
    return parseInt(sizeCode.replace('TP-', ''));
  };

  // Funzione per determinare la priorità di una taglia rispetto a una taglia desiderata
  const getSizeDistance = (sizeCode: string | undefined, targetSizeCode?: string): number => {
    if (!sizeCode) return Number.MAX_SAFE_INTEGER; // Le voci senza taglia vanno in fondo
    if (!targetSizeCode) return 0; // Se non c'è taglia target, non c'è distanza

    const sizeNum = getSizeNumberFromCode(sizeCode);
    const targetNum = getSizeNumberFromCode(targetSizeCode);

    if (sizeNum === 0 || targetNum === 0) return Number.MAX_SAFE_INTEGER;

    // Distanza numerica tra le taglie
    const distance = Math.abs(sizeNum - targetNum);

    // Log per debug
    console.log(`Calcolo distanza taglia: ${sizeCode} -> ${targetSizeCode}, distanza: ${distance}`);

    return distance;
  };

  // Funzione per aggiornare la taglia preferita
  useEffect(() => {
    localStorage.setItem('preferredSizeCode', preferredSize);
  }, [preferredSize]);

  // Funzione di ordinamento dei dati
  const sortData = (data: any[], config = sortConfig) => {
    if (!config.key) return data;

    // Usa la taglia target dal nostro stato
    const targetSizeCode = preferredSize;

    return [...data].sort((a, b) => {
      // Per campi numerici
      if (config.key === 'physicalNumber') {
        if (config.direction === 'asc') {
          return a.physicalNumber - b.physicalNumber;
        }
        return b.physicalNumber - a.physicalNumber;
      }

      // Ordinamento speciale per taglia
      if (config.key === 'size.code') {
        const aCode = a.size?.code;
        const bCode = b.size?.code;

        // Priorità 1: Le ceste con stato "active" vengono prima di quelle disponibili
        if (a.state !== b.state) {
          if (a.state === 'active' && b.state === 'available') {
            return -1;
          }
          if (a.state === 'available' && b.state === 'active') {
            return 1;
          }
        }

        // Priorità 2: Se entrambe hanno una taglia
        if (aCode && bCode) {
          // Prima priorità: la taglia esatta richiesta
          const aHasTargetSize = aCode === targetSizeCode;
          const bHasTargetSize = bCode === targetSizeCode;

          if (aHasTargetSize && !bHasTargetSize) {
            return -1;
          }
          if (!aHasTargetSize && bHasTargetSize) {
            return 1;
          }

          // Seconda priorità: somiglianza alla taglia target
          const aDistance = getSizeDistance(aCode, targetSizeCode);
          const bDistance = getSizeDistance(bCode, targetSizeCode);

          if (aDistance !== bDistance) {
            // Ordina per distanza dalla taglia richiesta (più vicina prima)
            return config.direction === 'asc' ? aDistance - bDistance : bDistance - aDistance;
          }

          // Se le distanze sono uguali, ordina numericamente per valore assoluto della taglia
          const aValue = getSizeNumberFromCode(aCode);
          const bValue = getSizeNumberFromCode(bCode);
          return config.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        // Priorità 3: Ceste con taglia vengono prima di quelle senza taglia
        if (aCode && !bCode) {
          return -1; 
        }
        if (!aCode && bCode) {
          return 1;
        }

        // Priorità 4: Se entrambe non hanno taglia, ordina per numero cesta (per mantenere un ordine coerente)
        return a.physicalNumber - b.physicalNumber;
      }

      // Per campi stringa
      if (typeof a[config.key] === 'string' && typeof b[config.key] === 'string') {
        if (config.direction === 'asc') {
          return a[config.key].localeCompare(b[config.key]);
        }
        return b[config.key].localeCompare(a[config.key]);
      }

      // Per campi annidati come 'size.code'
      if (config.key.includes('.')) {
        const keys = config.key.split('.');
        let aValue = a;
        let bValue = b;

        for (const key of keys) {
          aValue = aValue?.[key];
          bValue = bValue?.[key];
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (config.direction === 'asc') {
            return aValue.localeCompare(bValue);
          }
          return bValue.localeCompare(aValue);
        }
      }

      return 0;
    });
  };

  // Funzione per cambiare l'ordinamento
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter baskets
  let filteredBaskets = [...basketsArray].filter((basket: any) => {
    // Aggiungiamo il nome del FLUPSY per ogni cesta
    const flupsy = flupsysArray.find((f: any) => f.id === basket.flupsyId);
    if (flupsy) {
      basket.flupsyName = flupsy.name;
    }

    // Calcoliamo il numero di animali dall'ultima operazione
    if (basket.lastOperation && basket.lastOperation.animalCount) {
      basket.animalCount = basket.lastOperation.animalCount;
    }

    // Assicuriamoci che basket.size sia definito per l'ordinamento
    if (!basket.size) {
      // Per le ceste senza taglia, creiamo un oggetto size vuoto
      basket.size = {
        code: null,
        name: 'Non disponibile',
        color: '#e2e8f0'  // colore grigio chiaro per le ceste senza taglia
      };
    }

    // Filter by search term
    const matchesSearch = searchTerm === '' || 
      `${basket.physicalNumber}`.includes(searchTerm) || 
      (basket.currentCycleId ? `${basket.currentCycleId}`.includes(searchTerm) : false) ||
      (basket.flupsyName && basket.flupsyName.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter by state
    const matchesState = stateFilter === 'all' || 
      (stateFilter === 'active' && basket.state === 'active') ||
      (stateFilter === 'available' && basket.state === 'available');

    // Filter by FLUPSY
    const matchesFlupsy = flupsyFilter === 'all' || 
      String(basket.flupsyId) === flupsyFilter;

    return matchesSearch && matchesState && matchesFlupsy;
  });

  // Applichiamo l'ordinamento
  filteredBaskets = sortData(filteredBaskets);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-condensed font-bold text-gray-800">Gestione Ceste</h2>
        <div className="flex space-x-3">
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
          <div className="flex flex-wrap gap-4">
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
            <Select value={flupsyFilter} onValueChange={setFlupsyFilter}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center">
                  <Waves className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Unità FLUPSY" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le unità</SelectItem>
                {flupsysArray.length > 0 ? (
                  flupsysArray.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={String(flupsy.id)}>
                      {flupsy.name}
                    </SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
            <Select value={preferredSize} onValueChange={(size) => {
                setPreferredSize(size);
                // Imposta sempre l'ordinamento per taglia quando cambia la taglia preferita
                setSortConfig({
                  key: 'size.code',
                  direction: 'asc'
                });
              }}>
                <SelectTrigger className="w-[210px] border-blue-200 shadow-sm relative pl-9">
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
                    <div 
                      className="h-5 w-5 rounded-full ring-2 ring-white shadow-sm" 
                      style={{backgroundColor: getSizeColor(preferredSize)}}
                    ></div>
                  </div>
                  <div className="flex items-center">
                    <SelectValue placeholder="Taglia preferita" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TP-180">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-180')}}></div>
                      <span>Taglia TP-180</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-200">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-200')}}></div>
                      <span>Taglia TP-200</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-315">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-315')}}></div>
                      <span>Taglia TP-315</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-450">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-450')}}></div>
                      <span>Taglia TP-450</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-500">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-500')}}></div>
                      <span>Taglia TP-500</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-600">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-600')}}></div>
                      <span>Taglia TP-600</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-700">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-700')}}></div>
                      <span>Taglia TP-700</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-800">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-800')}}></div>
                      <span>Taglia TP-800</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-1000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-1000')}}></div>
                      <span>Taglia TP-1000</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-1500">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-1500')}}></div>
                      <span>Taglia TP-1500</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-2000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-2000')}}></div>
                      <span>Taglia TP-2000</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-3000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-3000')}}></div>
                      <span>Taglia TP-3000</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-5000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-5000')}}></div>
                      <span>Taglia TP-5000</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-8000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-8000')}}></div>
                      <span>Taglia TP-8000</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TP-10000">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full mr-2" style={{backgroundColor: getSizeColor('TP-10000')}}></div>
                      <span>Taglia TP-10000</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
          </div>
        </div>
      </div>

      {/* Baskets Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('physicalNumber')}
                >
                  <div className="flex items-center">
                    ID<br/>CESTA
                    {sortConfig.key === 'physicalNumber' && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3 w-3 ml-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        {sortConfig.direction === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  FLUPSY
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  LOTTO
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  CODICE<br/>CICLO ATTUALE
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  STATO
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  ULTIMA<br/>OPERAZIONE
                </th>
                <th 
                  scope="col" 
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${sortConfig.key === 'size.code' ? 'text-blue-600' : 'text-gray-600'}`}
                  onClick={() => requestSort('size.code')}
                >
                  <div className="flex items-center">
                    <span>Taglia Attuale</span>
                    {preferredSize && (
                      <div 
                        className="ml-2 h-3 w-3 rounded-full" 
                        style={{backgroundColor: getSizeColor(preferredSize)}}
                        title={`Ordinata in base alla taglia preferita: ${preferredSize}`}
                      ></div>
                    )}
                    {sortConfig.key === 'size.code' ? (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 ml-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        {sortConfig.direction === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort('animalCount')}
                >
                  <div className="flex items-center">
                    N°<br/>ANIMALI
                    {sortConfig.key === 'animalCount' && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-3 w-3 ml-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        {sortConfig.direction === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  DATA<br/>ATTIVAZIONE
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  AZIONI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Caricamento ceste...
                  </td>
                </tr>
              ) : filteredBaskets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Nessuna cesta trovata
                  </td>
                </tr>
              ) : (
                <>
                  {filteredBaskets.map((basket, index) => {
                    let statusBadge;
                    if (basket.state === 'active' && basket.currentCycleId) {
                      statusBadge = <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Ciclo attivo</Badge>;
                    } else if (basket.state === 'active' && !basket.currentCycleId) {
                      statusBadge = <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">prima-attivazione</Badge>;
                    } else {
                      statusBadge = <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">Disponibile</Badge>;
                    }

                    return (
                      <tr key={basket.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                          #{basket.physicalNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium">{basket.flupsyName || `FLUPSY #${basket.flupsyId}`}</span>
                            {basket.row && basket.position && (
                              <span className="text-xs text-gray-500">
                                Pos: {basket.row}-{basket.position}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {basket.lotId ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-indigo-600">Lotto #{basket.lotId}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                          {basket.cycleCode ? basket.cycleCode : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                          {basket.currentCycleId ? `#${basket.currentCycleId}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {basket.lastOperationType ? (
                            <div className="flex flex-col">
                              <span className="font-medium capitalize">{basket.lastOperationType}</span>
                              <span className="text-xs text-gray-500">
                                {basket.lastOperationDate ? new Date(basket.lastOperationDate).toLocaleDateString('it-IT') : '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            {(basket.size && basket.size.code) ? (
                              <Badge 
                                className={`size-badge ${basket.size.code === preferredSize ? 'ring-2 ring-blue-500 shadow-md' : ''}`}
                                style={{
                                  ...getSizeBadgeStyle(basket.size.code),
                                  transition: 'all 0.3s ease-in-out',
                                  transform: basket.size.code === preferredSize ? 'scale(1.1)' : 'scale(1)',
                                  fontWeight: basket.size.code === preferredSize ? 'bold' : 'normal'
                                }}
                              >
                                {basket.size.code}
                                {basket.size.code === preferredSize && (
                                  <span className="ml-1 bg-blue-500 rounded-full p-0.5 inline-flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 text-white" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </span>
                                )}
                              </Badge>
                            ) : (
                              <Badge 
                                className="bg-gray-100 text-gray-500 hover:bg-gray-200 opacity-70"
                                title={basket.state === 'active' ? 'Cesta attiva senza taglia rilevata' : 'Cesta disponibile'}
                              >
                                {basket.state === 'active' ? 'Non rilevata' : 'Non disponibile'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {basket.animalCount ? (
                            <span className="font-semibold">{basket.animalCount.toLocaleString('it-IT')}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {basket.currentCycle?.startDate ? (
                            <div className="flex flex-col">
                              <span>{new Date(basket.currentCycle.startDate).toLocaleDateString('it-IT')}</span>
                              <span className="text-xs text-muted-foreground">
                                {Math.floor((new Date().getTime() - new Date(basket.currentCycle.startDate).getTime()) / (1000 * 60 * 60 * 24))} giorni
                              </span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedBasket(basket);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-5 w-5 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedBasket(basket);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                            {basket.state === 'available' ? (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedBasket(basket);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-5 w-5 text-destructive" />
                              </Button>
                            ) : (
                              <div className="relative group">
                                <Button variant="ghost" size="icon" disabled>
                                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                                </Button>
                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                                  Non puoi eliminare una cesta con un ciclo attivo
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Riga totale */}
                  {filteredBaskets.length > 0 && (
                    <tr className="bg-muted/30 font-medium border-t-2 border-gray-300">
                      <td colSpan={7} className="px-6 py-4 text-right whitespace-nowrap text-sm font-bold text-gray-900">
                        Totale:
                      </td>
                      <td colSpan={1} className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="text-xs text-muted-foreground">{filteredBaskets.length} ceste</span>
                      </td>
                      <td colSpan={1} className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {filteredBaskets.reduce((total, basket) => total + (basket.animalCount || 0), 0).toLocaleString('it-IT')}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Basket Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crea Nuova Cesta</DialogTitle>
            <DialogDescription>
              Inserisci i dettagli per creare una nuova cesta nel sistema
            </DialogDescription>
          </DialogHeader>
          <BasketForm 
            onSubmit={(data) => createBasketMutation.mutate(data)} 
            isLoading={createBasketMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Basket Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Cesta</DialogTitle>
            <DialogDescription>
              Aggiorna i dettagli della cesta selezionata
            </DialogDescription>
          </DialogHeader>
          {selectedBasket && (
            <BasketForm 
              onSubmit={(data) => updateBasketMutation.mutate({ id: selectedBasket.id, basket: data })}
              isLoading={updateBasketMutation.isPending}
              basketId={selectedBasket.id}
              defaultValues={{
                physicalNumber: selectedBasket.physicalNumber,
                flupsyId: selectedBasket.flupsyId,
                row: selectedBasket.row || undefined,
                position: selectedBasket.position || undefined
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Basket Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dettagli Cesta</DialogTitle>
            <DialogDescription>
              Informazioni dettagliate e cronologia della cesta
            </DialogDescription>
          </DialogHeader>
          {selectedBasket && (
            <Tabs defaultValue="info">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info" className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  <span>Informazioni</span>
                </TabsTrigger>
                <TabsTrigger value="positions" className="flex items-center gap-1">
                  <History className="h-4 w-4" />
                  <span>Cronologia Posizioni</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4">
                <div className="rounded-lg bg-card border">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="text-lg font-semibold flex items-center">
                      Cesta #{selectedBasket.physicalNumber}
                      <Badge className="ml-2" variant={
                        selectedBasket.state === 'active' && selectedBasket.currentCycleId 
                          ? 'default' 
                          : selectedBasket.state === 'active' && !selectedBasket.currentCycleId
                            ? 'outline' 
                            : 'secondary'
                      }>
                        {selectedBasket.state === 'active' && selectedBasket.currentCycleId 
                          ? 'Ciclo attivo' 
                          : selectedBasket.state === 'active' && !selectedBasket.currentCycleId
                            ? 'Attiva, senza ciclo' 
                            : 'Disponibile'
                        }
                      </Badge>
                    </h3>
                  </div>

                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Unità FLUPSY</p>
                      <p className="font-medium">
                        {flupsysArray.find((f: any) => f.id === selectedBasket.flupsyId)?.name || `#${selectedBasket.flupsyId}`}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">ID Sistema</p>
                      <p className="font-medium">#{selectedBasket.id}</p>
                    </div>

                    {selectedBasket.row && selectedBasket.position && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Posizione Attuale</p>
                        <p className="font-medium text-primary">Fila {selectedBasket.row}, Posizione {selectedBasket.position}</p>
                      </div>
                    )}

                    {selectedBasket.cycleCode && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Codice Ciclo</p>
                        <p className="font-medium text-primary">{selectedBasket.cycleCode}</p>
                      </div>
                    )}

                    {selectedBasket.currentCycleId && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Ciclo Attivo</p>
                        <p className="font-medium text-primary">#{selectedBasket.currentCycleId}</p>
                      </div>
                    )}

                    {(selectedBasket.currentCycle?.lotId || selectedBasket.lotId) && (
                      <div className="col-span-2">
                        <p className="text-sm font-medium text-muted-foreground">Lotto</p>
                        <p className="font-medium text-primary">
                          #{selectedBasket.currentCycle?.lotId || selectedBasket.lotId}
                          {(selectedBasket.currentCycle?.lotName || selectedBasket.lotName) && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              {selectedBasket.currentCycle?.lotName || selectedBasket.lotName}
                            </span>
                          )}
                        </p>
                        {(selectedBasket.currentCycle?.lotSupplier || selectedBasket.lotSupplier) && (
                          <p className="text-sm text-muted-foreground">
                            Fornitore: {selectedBasket.currentCycle?.lotSupplier || selectedBasket.lotSupplier}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedBasket.nfcData && (
                      <div className="col-span-2 border-t pt-3 mt-2">
                        <p className="text-sm font-medium text-muted-foreground">Dati NFC</p>
                        <p className="font-mono text-xs p-2 bg-muted rounded-md mt-1 overflow-x-auto">
                          {selectedBasket.nfcData}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="positions" className="mt-4 space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg border">
                  <h3 className="text-sm font-semibold mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    Cronologia degli spostamenti
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4">
                    Questa sezione mostra tutti i movimenti e cambi di posizione della cesta nel corso del tempo.
                    Le posizioni sono ordinate cronologicamente dalla più recente alla più vecchia.
                  </p>

                  <BasketPositionHistory basketId={selectedBasket.id} />
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Basket Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Elimina Cesta</DialogTitle>
            <DialogDescription className="text-destructive-foreground/80">
              Stai per eliminare questa cesta. Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          {selectedBasket && (
            <>
              <div className="p-4 my-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Numero cesta</p>
                    <p className="font-medium">#{selectedBasket.physicalNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unità FLUPSY</p>
                    <p className="font-medium">
                      {flupsysArray.find((f: any) => f.id === selectedBasket.flupsyId)?.name || `#${selectedBasket.flupsyId}`}
                    </p>
                  </div>
                  {selectedBasket.row && selectedBasket.position && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Posizione</p>
                      <p className="font-medium">Fila {selectedBasket.row}, Posizione {selectedBasket.position}</p>
                    </div>
                  )}
                  {selectedBasket.cycleCode && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Codice Ciclo</p>
                      <p className="font-medium">{selectedBasket.cycleCode}</p>
                    </div>
                  )}

                  {(selectedBasket.currentCycle?.lotId || selectedBasket.lotId) && (
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Lotto</p>
                      <p className="font-medium">
                        #{selectedBasket.currentCycle?.lotId || selectedBasket.lotId}
                        {(selectedBasket.currentCycle?.lotSupplier || selectedBasket.lotSupplier) && (
                          <span className="ml-2 text-sm text-gray-500">
                            {selectedBasket.currentCycle?.lotSupplier || selectedBasket.lotSupplier}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Stato</p>
                    <p className="font-medium flex items-center">
                      {selectedBasket.state === 'available' ? (
                        <><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2"></span> Disponibile</>
                      ) : selectedBasket.state === 'active' && selectedBasket.currentCycleId ? (
                        <><span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2"></span> In uso (ciclo attivo)</>
                      ) : (
                        <><span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2"></span> Attiva, senza ciclo</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 p-4 rounded-md bg-amber-50 text-amber-900 border border-amber-200 mb-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Importante:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Il numero di cesta sarà nuovamente disponibile per future ceste.</li>
                    <li>Non è possibile eliminare ceste con cicli attivi.</li>
                    <li>Le operazioni storiche rimarranno nel sistema.</li>
                  </ul>
                </div>
              </div>
            </>
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
              onClick={() => selectedBasket && deleteBasketMutation.mutate(selectedBasket.id)}
              disabled={deleteBasketMutation.isPending || (selectedBasket && selectedBasket.state !== 'available')}
            >
              {deleteBasketMutation.isPending ? "Eliminazione in corso..." : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}