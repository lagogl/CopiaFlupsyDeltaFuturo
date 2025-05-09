import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Eye, Copy, Download, Plus, Filter, Upload, Pencil, Search, Waves,
  Trash2, AlertTriangle, History, MapPin, Info
} from 'lucide-react';
import { getSizeBadgeStyle } from '@/lib/sizeUtils';
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

export default function Baskets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [flupsyFilter, setFlupsyFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBasket, setSelectedBasket] = useState<any>(null);
  const [location] = useLocation();
  const [urlParamsLoaded, setUrlParamsLoaded] = useState(false);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({
    key: 'physicalNumber',
    direction: 'asc'
  });
  
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

  // Prepare baskets array with additional data
  const basketsArray = Array.isArray(baskets) ? baskets : [];
  const flupsysArray = Array.isArray(flupsys) ? flupsys : [];
  
  // Funzione di ordinamento dei dati
  const sortData = (data: any[], config = sortConfig) => {
    if (!config.key) return data;
    
    return [...data].sort((a, b) => {
      // Per campi numerici
      if (config.key === 'physicalNumber') {
        if (config.direction === 'asc') {
          return a.physicalNumber - b.physicalNumber;
        }
        return b.physicalNumber - a.physicalNumber;
      }
      
      // Per campi stringa
      if (typeof a[config.key] === 'string' && typeof b[config.key] === 'string') {
        if (config.direction === 'asc') {
          return a[config.key].localeCompare(b[config.key]);
        }
        return b[config.key].localeCompare(a[config.key]);
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
          </div>
        </div>
      </div>

      {/* Baskets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => {
                    // Ordina le ceste per ID (physicalNumber)
                    const sortedBaskets = [...filteredBaskets].sort((a, b) => a.physicalNumber - b.physicalNumber);
                    // Sostituisce filteredBaskets con la versione ordinata
                    filteredBaskets.splice(0, filteredBaskets.length, ...sortedBaskets);
                    // Forza il re-render
                    setSearchTerm(searchTerm);
                  }}
                >
                  <div className="flex items-center">
                    ID Cesta
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  FLUPSY
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Codice Ciclo
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
                  if (basket.state === 'active' && basket.currentCycleId) {
                    statusBadge = <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Ciclo attivo</Badge>;
                  } else if (basket.state === 'active' && !basket.currentCycleId) {
                    statusBadge = <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Attiva, senza ciclo</Badge>;
                  } else {
                    statusBadge = <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Disponibile</Badge>;
                  }

                  return (
                    <tr key={basket.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{basket.physicalNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span>{basket.flupsyName || `FLUPSY #${basket.flupsyId}`}</span>
                          {basket.row && basket.position && (
                            <span className="text-xs text-muted-foreground">
                              Pos: {basket.row}-{basket.position}
                            </span>
                          )}
                        </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {basket.lastOperation ? (
                          <div className="flex flex-col">
                            <span>{basket.lastOperation.type}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(basket.lastOperation.date).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {basket.size ? (
                          <div className="flex flex-col">
                            <Badge 
                              className="size-badge"
                              style={getSizeBadgeStyle(basket.size.code)}
                            >
                              {basket.size.code}
                            </Badge>
                            {basket.animalCount && (
                              <span className="text-xs text-muted-foreground mt-1">
                                <span className="font-bold">{basket.animalCount.toLocaleString('it-IT')}</span> animali
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">-</Badge>
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
                })
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
