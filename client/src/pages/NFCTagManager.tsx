import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import NFCWriter from '@/components/NFCWriter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form';
import { TagIcon, SearchIcon, PlusCircleIcon, InfoIcon, MapPinIcon, RefreshCwIcon, UsbIcon, WifiIcon, AlertTriangleIcon, BluetoothIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { nfcService } from '@/nfc-features/utils/nfcService';
import BluetoothNFCGuide from '@/components/BluetoothNFCGuide';

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  nfcData: string | null;
}

interface Flupsy {
  id: number;
  name: string;
  location: string | null;
}

interface PositionFormData {
  row: string;
  position: string;
}

interface AvailablePositions {
  success: boolean;
  flupsyName: string;
  availableRows: string[];
  availablePositions: Record<string, number[]>;
}

export default function NFCTagManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filter, setFilter] = useState<string>('all');
  const [selectedBasketId, setSelectedBasketId] = useState<number | null>(null);
  const [isWriterOpen, setIsWriterOpen] = useState(false);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [selectedBasketForPosition, setSelectedBasketForPosition] = useState<Basket | null>(null);
  const [availablePositionsData, setAvailablePositionsData] = useState<AvailablePositions | null>(null);
  const [selectedRow, setSelectedRow] = useState<string>("");
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [nfcSupportInfo, setNfcSupportInfo] = useState<{type: string; description: string; recommended: string} | null>(null);
  
  // Form per l'assegnazione della posizione
  const positionForm = useForm<PositionFormData>({
    defaultValues: {
      row: '',
      position: ''
    }
  });

  // Rileva il supporto NFC all'avvio
  useEffect(() => {
    const supportInfo = nfcService.getNFCSupportType();
    setNfcSupportInfo(supportInfo);
  }, []);
  
  // Carica i cestelli
  const {
    data: baskets = [],
    isLoading: basketsLoading,
    error: basketsError
  } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Carica i flupsy
  const {
    data: flupsys = [],
    isLoading: flupsysLoading
  } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
  });
  
  // Mutation per aggiornare la posizione di un cestello
  const updateBasketPosition = useMutation({
    mutationFn: async (data: { basketId: number, row: string, position: number, flupsyId: number }) => {
      console.log(`Invio richiesta di aggiornamento posizione: basketId=${data.basketId}, row=${data.row}, position=${data.position}, flupsyId=${data.flupsyId || 'non specificato'}`);
      
      try {
        const response = await fetch(`/api/baskets/${data.basketId}/position`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            row: data.row,
            position: data.position,
            flupsyId: data.flupsyId
          }),
        });
        
        // Controlla se la risposta è un JSON valido
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const jsonData = await response.json();
          
          if (!response.ok) {
            throw new Error(jsonData.message || 'Si è verificato un errore durante l\'aggiornamento della posizione');
          }
          
          return jsonData;
        } else {
          // Se non è JSON, leggi come testo per il debug
          const textData = await response.text();
          console.error("Risposta non JSON ricevuta:", textData);
          throw new Error("Risposta non valida dal server");
        }
      } catch (error) {
        console.error("Errore durante l'aggiornamento della posizione:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Posizione aggiornata con successo:", data);
      
      // Invalida la cache per ricaricare i cestelli
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      // Chiudi il dialog
      setIsPositionDialogOpen(false);
      setSelectedBasketForPosition(null);
      
      // Mostra una notifica di successo
      toast({
        title: "Posizione aggiornata",
        description: "La posizione del cestello è stata aggiornata con successo.",
      });
      
      // Reset del form
      positionForm.reset();
    },
    onError: (error: Error) => {
      console.error("Errore nella mutation:", error);
      
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiornamento della posizione. Riprova.",
        variant: "destructive",
      });
    }
  });

  // Mutation per cambiare lo stato del cestello
  const toggleBasketState = useMutation({
    mutationFn: async (data: { basketId: number, currentState: string }) => {
      const newState = data.currentState === 'available' ? 'active' : 'available';
      
      // Se si sta impostando lo stato a "available", rimuovi anche il currentCycleId
      const updateData: any = { state: newState };
      if (newState === 'available') {
        updateData.currentCycleId = null;
      }
      
      const response = await fetch(`/api/baskets/${data.basketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Errore durante il cambio stato');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del cestello è stato modificato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante il cambio stato.",
        variant: "destructive",
      });
    }
  });

  // Filtra i cestelli in base alla ricerca e ai filtri
  const filteredBaskets = baskets.filter((basket) => {
    // Filtra per termine di ricerca
    const matchesSearch = 
      basket.physicalNumber.toString().includes(searchTerm) ||
      (basket.row && basket.row.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (basket.position && basket.position.toString().includes(searchTerm));
    
    // Filtra per stato del tag NFC
    if (filter === 'with-nfc' && !basket.nfcData) return false;
    if (filter === 'without-nfc' && basket.nfcData) return false;
    
    return matchesSearch;
  });

  // Gestisce l'apertura del writer NFC
  const handleOpenWriter = (basketId: number) => {
    setSelectedBasketId(basketId);
    setIsWriterOpen(true);
  };

  // Gestisce la chiusura del writer NFC
  const handleCloseWriter = () => {
    setIsWriterOpen(false);
  };

  // Gestisce il completamento della scrittura
  const handleWriteSuccess = () => {
    setIsWriterOpen(false);
    setSelectedBasketId(null);
    
    // Invalida la cache per ricaricare i cestelli
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    setLastRefreshTime(Date.now());
    
    // Mostra una notifica di successo
    toast({
      title: "Tag NFC programmato",
      description: "Il tag NFC è stato programmato con successo.",
    });
  };
  
  // Query per ottenere le posizioni disponibili in un flupsy
  const fetchAvailablePositions = async (flupsyId: number) => {
    try {
      console.log(`Richiesta posizioni disponibili per flupsy ID: ${flupsyId}`);
      const response = await fetch(`/api/flupsys/${flupsyId}/available-positions`);
      
      if (!response.ok) {
        throw new Error(`Errore nel recupero delle posizioni disponibili: ${response.status} ${response.statusText}`);
      }
      
      const rawData = await response.json();
      console.log("Dati posizioni ricevuti:", rawData);
      
      // Verifica che i dati siano nella struttura corretta
      if (!rawData.success) {
        throw new Error("La risposta API non ha avuto successo");
      }
      
      // Se mancano campi essenziali, crea una struttura predefinita
      if (!rawData.availableRows || !rawData.availablePositions) {
        console.warn("Dati delle posizioni incompleti, utilizzo valori predefiniti");
        return {
          success: true,
          flupsyName: rawData.flupsyName || "Flupsy",
          availableRows: rawData.availableRows || ["SX", "DX"],
          availablePositions: rawData.availablePositions || { "SX": [1,2,3], "DX": [1,2,3] }
        };
      }
      
      return rawData as AvailablePositions;
    } catch (error) {
      console.error("Errore durante il recupero delle posizioni disponibili:", error);
      toast({
        title: "Errore",
        description: "Impossibile recuperare le posizioni disponibili",
        variant: "destructive",
      });
      
      // Fornisce valori predefiniti in caso di errore
      return {
        success: true,
        flupsyName: "Flupsy (default)",
        availableRows: ["SX", "DX", "C"],
        availablePositions: {
          "SX": [1, 2, 3, 4, 5],
          "DX": [1, 2, 3, 4, 5],
          "C": [1, 2, 3]
        }
      };
    }
  };

  // Gestisce l'apertura del dialogo per l'assegnazione della posizione
  const handleOpenPositionDialog = async (basket: Basket) => {
    setSelectedBasketForPosition(basket);
    setIsPositionDialogOpen(true);
    
    try {
      // Imposta valori predefiniti di base
      const defaultRows = ["SX", "DX", "C"];
      const defaultPositions = {
        "SX": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "DX": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        "C": [1, 2, 3, 4, 5, 6]
      };
      
      // Se il cestello ha già una posizione, usa quella
      let initialRow = basket.row || defaultRows[0];
      let initialPosition = basket.position?.toString() || "1";
      
      // Prova a recuperare le posizioni disponibili dal server
      try {
        const positionsData = await fetchAvailablePositions(basket.flupsyId);
        if (positionsData && positionsData.success) {
          console.log("Posizioni disponibili ricevute:", positionsData);
          
          setAvailablePositionsData(positionsData);
          
          // Se il server ha restituito file disponibili, aggiorna la selezione
          if (positionsData.availableRows && positionsData.availableRows.length > 0) {
            // Se la fila attuale del cestello è tra quelle disponibili, usala
            if (basket.row && positionsData.availableRows.includes(basket.row)) {
              initialRow = basket.row;
            } else {
              initialRow = positionsData.availableRows[0];
            }
          }
          
          // Se ci sono posizioni disponibili per la fila selezionata
          if (positionsData.availablePositions && 
              positionsData.availablePositions[initialRow] && 
              positionsData.availablePositions[initialRow].length > 0) {
            
            // Se la posizione attuale è tra quelle disponibili, usala
            if (basket.position && 
                positionsData.availablePositions[initialRow].includes(basket.position)) {
              initialPosition = basket.position.toString();
            } else {
              initialPosition = positionsData.availablePositions[initialRow][0].toString();
            }
          }
        } else {
          // Se la richiesta non ha avuto successo, usa valori predefiniti
          console.warn("Risposta API non valida, utilizzo valori predefiniti");
          setAvailablePositionsData({
            success: true,
            flupsyName: getFlupsyName(basket.flupsyId),
            availableRows: defaultRows,
            availablePositions: defaultPositions
          });
        }
      } catch (error) {
        console.error("Errore durante il recupero delle posizioni:", error);
        // In caso di errore, usa valori predefiniti
        setAvailablePositionsData({
          success: true,
          flupsyName: getFlupsyName(basket.flupsyId),
          availableRows: defaultRows,
          availablePositions: defaultPositions
        });
      }
      
      // Imposta i valori nel form
      positionForm.setValue('row', initialRow);
      setSelectedRow(initialRow);
      positionForm.setValue('position', initialPosition);
      
      console.log(`Valori iniziali impostati: fila=${initialRow}, posizione=${initialPosition}`);
    } catch (e) {
      console.error("Errore durante l'apertura del dialogo:", e);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'apertura del dialogo",
        variant: "destructive"
      });
    }
  };
  
  // Gestisce la chiusura del dialogo per l'assegnazione della posizione
  const handleClosePositionDialog = () => {
    setIsPositionDialogOpen(false);
    setSelectedBasketForPosition(null);
    setAvailablePositionsData(null);
    setSelectedRow("");
    positionForm.reset();
  };
  
  // Gestisce il cambio di fila
  const handleRowChange = (row: string) => {
    setSelectedRow(row);
    positionForm.setValue('row', row);
    
    // Se ci sono posizioni disponibili in questa fila, seleziona la prima
    if (availablePositionsData && availablePositionsData.availablePositions[row] && availablePositionsData.availablePositions[row].length > 0) {
      positionForm.setValue('position', availablePositionsData.availablePositions[row][0].toString());
    } else {
      positionForm.setValue('position', '');
    }
  };
  
  // Gestisce il salvataggio della posizione
  const handleSavePosition = positionForm.handleSubmit((data) => {
    if (!selectedBasketForPosition) return;
    
    // Converti i valori in string e number
    const row = data.row;
    const position = parseInt(data.position);
    
    if (isNaN(position)) {
      toast({
        title: "Errore",
        description: "La posizione deve essere un numero valido",
        variant: "destructive",
      });
      return;
    }
    
    // Nascondi l'eventuale messaggio di errore che potrebbe essere visualizzato
    const errorElement = document.querySelector('.error-message-position');
    if (errorElement) {
      errorElement.classList.add('hidden');
    }
    
    console.log(`Salvataggio posizione: cestello=${selectedBasketForPosition.id}, fila=${row}, posizione=${position}, flupsyId=${selectedBasketForPosition.flupsyId}`);
    
    // Esegui la mutation per aggiornare la posizione includendo il flupsyId
    updateBasketPosition.mutate({
      basketId: selectedBasketForPosition.id,
      row,
      position,
      flupsyId: selectedBasketForPosition.flupsyId
    });
  });

  // Trova il nome del flupsy di un cestello
  const getFlupsyName = (flupsyId: number): string => {
    const flupsy = flupsys.find(f => f.id === flupsyId);
    return flupsy ? flupsy.name : 'Sconosciuto';
  };

  // Ottiene la posizione completa del cestello
  const getBasketPosition = (basket: Basket): string => {
    if (basket.row && basket.position) {
      return `${basket.row}-${basket.position}`;
    }
    return 'Non assegnata';
  };
  
  // Gestisce il refresh automatico quando l'app torna in primo piano (importante per mobile/NFC)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // L'app è tornata in primo piano, verifica se è passato abbastanza tempo
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTime;
        
        // Refresh automatico se sono passati più di 5 secondi
        if (timeSinceLastRefresh > 5000) {
          console.log('App tornata in primo piano dopo programmazione NFC, refresh automatico');
          queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
          queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
          setLastRefreshTime(now);
        }
      }
    };

    // Refresh automatico periodico ogni 30 secondi per sincronizzazione cross-device
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Solo se sono passati più di 30 secondi dall'ultimo refresh manuale
      if (timeSinceLastRefresh > 30000) {
        console.log('Refresh automatico periodico per sincronizzazione');
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
        setLastRefreshTime(now);
      }
    }, 30000); // Ogni 30 secondi

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [lastRefreshTime, queryClient]);

  // Gestisce il refresh manuale della lista con invalidazione forzata
  const handleRefresh = async () => {
    // Rimuovi tutto dalla cache per forzare il refetch completo
    queryClient.removeQueries({ queryKey: ['/api/baskets'] });
    queryClient.removeQueries({ queryKey: ['/api/flupsys'] });
    queryClient.removeQueries({ queryKey: ['/api/operations'] });
    
    // Invalida tutte le cache correlate
    queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
    
    // Forza il refetch immediato
    await queryClient.refetchQueries({ queryKey: ['/api/baskets'] });
    
    setLastRefreshTime(Date.now());
    toast({
      title: "Cache pulita e lista aggiornata",
      description: "Tutti i dati sono stati ricaricati dal server.",
    });
  };

  // Trova il cestello selezionato
  const selectedBasket = baskets.find(b => b.id === selectedBasketId);

  // Componente per mostrare lo stato del supporto NFC
  const NFCSupportStatus = () => {
    if (!nfcSupportInfo) return null;

    const getStatusIcon = () => {
      switch (nfcSupportInfo.type) {
        case 'web-nfc':
          return <WifiIcon className="h-5 w-5 text-green-600" />;
        case 'bluetooth-nfc':
          return <BluetoothIcon className="h-5 w-5 text-blue-600" />;
        case 'usb-nfc':
        case 'hid-nfc':
          return <UsbIcon className="h-5 w-5 text-blue-600" />;
        case 'sw-nfc':
          return <TagIcon className="h-5 w-5 text-yellow-600" />;
        default:
          return <AlertTriangleIcon className="h-5 w-5 text-red-600" />;
      }
    };

    const getStatusColor = () => {
      switch (nfcSupportInfo.type) {
        case 'web-nfc':
          return 'border-green-200 bg-green-50';
        case 'bluetooth-nfc':
          return 'border-blue-200 bg-blue-50';
        case 'usb-nfc':
        case 'hid-nfc':
          return 'border-blue-200 bg-blue-50';
        case 'sw-nfc':
          return 'border-yellow-200 bg-yellow-50';
        default:
          return 'border-red-200 bg-red-50';
      }
    };

    const activateSimulation = () => {
      nfcService.enableSimulationMode();
    };

    return (
      <Card className={`mb-6 ${getStatusColor()}`}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {getStatusIcon()}
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">
                Stato Lettore NFC
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {nfcSupportInfo.description}
              </p>
              <p className="text-sm font-medium">
                {nfcSupportInfo.recommended}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Gestione Tag NFC</h1>
      
      <NFCSupportStatus />
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Programma nuovi tag NFC</CardTitle>
          <CardDescription>
            Seleziona un cestello dalla lista e crea un nuovo tag NFC da attaccare alla cesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-4">
              {/* Ricerca */}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  className="pl-10"
                  placeholder="Cerca per numero o posizione..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filtro */}
              <div className="lg:w-64">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtra per stato NFC" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i cestelli</SelectItem>
                    <SelectItem value="with-nfc">Con tag NFC</SelectItem>
                    <SelectItem value="without-nfc">Senza tag NFC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Pulsante Refresh - Sempre visibile */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={basketsLoading}
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 px-6 py-2"
              >
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${basketsLoading ? 'animate-spin' : ''}`} />
                {basketsLoading ? 'Aggiornamento...' : 'Aggiorna Lista'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabella dei cestelli */}
      <Card>
        <CardHeader>
          <CardTitle>Lista cestelli</CardTitle>
          <CardDescription>
            {filteredBaskets.length} cestelli visualizzati
          </CardDescription>
        </CardHeader>
        <CardContent>
          {basketsLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">N. Cestello</TableHead>
                    <TableHead>Flupsy</TableHead>
                    <TableHead>Posizione</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Tag NFC</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBaskets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                        Nessun cestello trovato con i filtri applicati
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBaskets.map((basket) => (
                      <TableRow key={basket.id}>
                        <TableCell className="font-medium">#{basket.physicalNumber}</TableCell>
                        <TableCell>{getFlupsyName(basket.flupsyId)}</TableCell>
                        <TableCell>{getBasketPosition(basket)}</TableCell>
                        <TableCell>
                          {(() => {
                            const isInUse = basket.state === 'active' || basket.currentCycleId !== null;
                            return (
                              <Badge variant={isInUse ? 'default' : 'outline'}>
                                {isInUse ? 'In uso' : 'Disponibile'}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {basket.nfcData ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                              Tag programmato
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              Nessun tag
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end flex-wrap">
                            {(() => {
                              const isInUse = basket.state === 'active' || basket.currentCycleId !== null;
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleBasketState.mutate({ 
                                    basketId: basket.id, 
                                    currentState: isInUse ? 'active' : 'available'
                                  })}
                                  disabled={toggleBasketState.isPending}
                                  className={isInUse 
                                    ? "bg-orange-50 hover:bg-orange-100 border-orange-300" 
                                    : "bg-green-50 hover:bg-green-100 border-green-300"}
                                  title={isInUse ? 'Segna come disponibile' : 'Segna come in uso'}
                                >
                                  {isInUse ? (
                                    <ToggleLeft className="h-4 w-4" />
                                  ) : (
                                    <ToggleRight className="h-4 w-4" />
                                  )}
                                </Button>
                              );
                            })()}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPositionDialog(basket)}
                              className={basket.row && basket.position 
                                ? "bg-blue-50" 
                                : "bg-red-600 hover:bg-red-700 text-white"}
                            >
                              <MapPinIcon className="mr-2 h-4 w-4" />
                              {basket.row && basket.position ? 'Modifica posizione' : 'Assegna posizione'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenWriter(basket.id)}
                            >
                              <TagIcon className="mr-2 h-4 w-4" />
                              {basket.nfcData ? 'Riprogramma' : 'Programma'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Dialog per il writer NFC */}
      <Dialog open={isWriterOpen} onOpenChange={setIsWriterOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedBasket && (
            <NFCWriter
              basketId={selectedBasket.id}
              basketNumber={selectedBasket.physicalNumber}
              onSuccess={handleWriteSuccess}
              onCancel={handleCloseWriter}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog per l'assegnazione della posizione */}
      <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedBasketForPosition?.row && selectedBasketForPosition?.position
                ? 'Modifica posizione del cestello'
                : 'Assegna posizione al cestello'}
            </DialogTitle>
            <DialogDescription>
              {selectedBasketForPosition && (
                <span>
                  Cestello #{selectedBasketForPosition.physicalNumber} - {getFlupsyName(selectedBasketForPosition.flupsyId)}
                  {selectedBasketForPosition.state === 'active' ? ' (In uso)' : ' (Disponibile)'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...positionForm}>
            <form onSubmit={handleSavePosition} className="space-y-4">
              <FormField
                control={positionForm.control}
                name="row"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fila</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => handleRowChange(value)}
                      disabled={!availablePositionsData}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={availablePositionsData ? "Seleziona una fila" : "Caricamento..."} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePositionsData && availablePositionsData.availableRows && 
                          availablePositionsData.availableRows.map(row => (
                            <SelectItem key={row} value={row}>
                              Fila {row}
                            </SelectItem>
                          ))
                        }
                        {(!availablePositionsData || !availablePositionsData.availableRows || availablePositionsData.availableRows.length === 0) && (
                          <>
                            <SelectItem value="SX">Fila SX</SelectItem>
                            <SelectItem value="DX">Fila DX</SelectItem>
                            <SelectItem value="C">Fila C</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={positionForm.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posizione</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={!selectedRow || !availablePositionsData?.availablePositions[selectedRow]?.length}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedRow 
                              ? "Seleziona prima una fila" 
                              : !availablePositionsData?.availablePositions[selectedRow]?.length 
                                ? "Nessuna posizione disponibile" 
                                : "Seleziona una posizione"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedRow && availablePositionsData && availablePositionsData.availablePositions && 
                          availablePositionsData.availablePositions[selectedRow] && 
                          availablePositionsData.availablePositions[selectedRow].map(pos => (
                            <SelectItem key={pos} value={pos.toString()}>
                              Posizione {pos}
                            </SelectItem>
                          ))
                        }
                        {(!selectedRow || !availablePositionsData || !availablePositionsData.availablePositions || 
                          !availablePositionsData.availablePositions[selectedRow] || 
                          availablePositionsData.availablePositions[selectedRow]?.length === 0) && (
                          <>
                            <SelectItem value="1">Posizione 1</SelectItem>
                            <SelectItem value="2">Posizione 2</SelectItem>
                            <SelectItem value="3">Posizione 3</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={handleClosePositionDialog}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateBasketPosition.isPending}>
                  {updateBasketPosition.isPending ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                      Salvataggio...
                    </>
                  ) : (
                    'Salva posizione'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}