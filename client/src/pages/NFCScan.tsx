import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import NFCReader from '@/components/NFCReader';

// Definizione delle interfacce per i dati del cestello
interface BasketDetails {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  nfcData: string | null;
  cycleCode: string | null;
  flupsy?: {
    id: number;
    name: string;
    location: string | null;
  };
  lastOperation?: {
    id: number;
    date: string;
    type: string;
    animalsPerKg: number | null;
    averageWeight: number | null;
    sizeId: number | null;
    mortalityRate: number | null;
    notes: string | null;
  };
  currentCycle?: {
    id: number;
    startDate: string;
    endDate: string | null;
    state: string;
  };
  size?: {
    id: number;
    code: string;
    name: string;
    sizeMm: number | null;
    minAnimalsPerKg: number | null;
    maxAnimalsPerKg: number | null;
  };
  operations?: any[];
  cycleDuration?: number;
  growthRate?: number;
  currentPosition?: {
    id: number;
    row: string;
    position: number;
    flupsyId: number;
    startDate: string;
  };
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import {
  getOperationTypeLabel,
  getOperationTypeColor,
  formatNumberWithCommas,
  calculateAverageWeight,
  getSizeColor
} from '@/lib/utils';

import {
  ScanIcon,
  InfoIcon,
  AlertCircleIcon,
  XIcon,
  ChevronRightIcon,
  ArrowRightIcon,
  MoveIcon,
  ClipboardIcon,
  HistoryIcon,
  Target
} from 'lucide-react';

export default function NFCScan({ params }: { params?: { id?: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBasketId, setScannedBasketId] = useState<number | null>(
    params?.id ? parseInt(params.id) : null
  );
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Query per ottenere i dati del cestello scansionato
  const { 
    data: basketData,
    isLoading: isLoadingBasket,
    error: basketError
  } = useQuery<BasketDetails>({
    queryKey: ['/api/baskets/details', scannedBasketId],
    queryFn: async () => {
      if (!scannedBasketId) throw new Error("ID cestello non specificato");
      const response = await apiRequest('GET', `/api/baskets/details/${scannedBasketId}`);
      return response as unknown as BasketDetails;
    },
    enabled: scannedBasketId !== null,
  });
  
  // Gestisce l'avvio della scansione NFC
  const startScan = () => {
    setIsScanning(true);
    setScanError(null);
    
    // Se non siamo su mobile, simuliamo una scansione per il debug
    if (!isMobile) {
      toast({
        title: "Modalità simulazione",
        description: "L'app è in esecuzione su desktop. La scansione NFC è disponibile solo su dispositivi mobili con supporto NFC.",
      });
    }
  };
  
  // Gestisce l'interruzione della scansione NFC
  const stopScan = () => {
    setIsScanning(false);
  };
  
  // Gestisce la lettura del tag NFC
  const handleNFCRead = (records: any) => {
    console.log("NFC tag letto:", records);
    
    try {
      // Modalità Debug: Mostra sempre i dati grezzi del tag
      const rawTagData = records.map((record: any) => ({
        type: record.recordType,
        mediaType: record.mediaType,
        dataType: typeof record.data,
        data: record.data,
        dataPreview: typeof record.data === 'string' ? 
          (record.data.length > 100 ? record.data.substring(0, 100) + '...' : record.data) : 
          'Dati non testuali'
      }));
      
      // Mostra dati di debug in un toast
      toast({
        title: "Debug NFC",
        description: "Dati grezzi del tag visualizzati nella console",
        variant: "default",
      });
      
      console.log("DATI GREZZI DEL TAG NFC:", rawTagData);
      
      if (typeof rawTagData[0]?.data === 'string') {
        console.log("Contenuto testuale del tag:", rawTagData[0].data);
        
        try {
          // Prova a fare il parsing come JSON
          const jsonData = JSON.parse(rawTagData[0].data);
          console.log("Contenuto JSON del tag:", jsonData);
        } catch (e) {
          console.log("Il contenuto non è in formato JSON valido");
        }
      }
      
      // Continua con la logica normale
      // Cerca il record contenente l'ID del cestello
      const basketRecord = records.find((record: any) => 
        record.recordType === 'text' || 
        (record.recordType === 'mime' && record.mediaType === 'application/json')
      );
      
      if (basketRecord) {
        let basketData;
        
        // Parsing del record in base al tipo
        if (typeof basketRecord.data === 'string') {
          try {
            basketData = JSON.parse(basketRecord.data);
            console.log("JSON parsing riuscito:", basketData);
          } catch (e) {
            console.error("Errore nel parsing JSON:", e);
            // Se non è JSON, potrebbe essere un ID diretto
            const basketId = parseInt(basketRecord.data);
            if (!isNaN(basketId)) {
              basketData = { id: basketId };
              console.log("ID numerico trovato:", basketId);
            } else {
              console.error("Non è stato possibile interpretare il contenuto del tag");
            }
          }
        } else if (typeof basketRecord.data === 'object') {
          basketData = basketRecord.data;
          console.log("Dati già in formato oggetto:", basketData);
        }
        
        // MODIFICA: Estrai l'ID da diverse fonti possibili
        let basketId = null;
        
        if (basketData) {
          // Caso 1: ID direttamente nel campo id
          if (basketData.id && typeof basketData.id === 'number') {
            basketId = basketData.id;
            console.log("ID cestello trovato nel campo 'id':", basketId);
          }
          // Caso 2: URL di reindirizzamento che contiene l'ID
          else if (basketData.redirectTo && typeof basketData.redirectTo === 'string') {
            console.log("Trovato URL di redirect:", basketData.redirectTo);
            // Estrai l'ID dalla fine dell'URL di reindirizzamento
            // Pattern: /nfc-scan/basket/ID o /cycles/ID
            const basketPattern = /\/basket\/(\d+)$/;
            const cyclePattern = /\/cycles\/(\d+)$/;
            
            let match = basketData.redirectTo.match(basketPattern);
            if (match && match[1]) {
              basketId = parseInt(match[1]);
              console.log("ID cestello estratto dall'URL di redirect:", basketId);
            } else {
              match = basketData.redirectTo.match(cyclePattern);
              if (match && match[1]) {
                // In questo caso è l'ID del ciclo, ma possiamo usarlo per ottenere il cestello
                const cycleId = parseInt(match[1]);
                console.log("ID ciclo trovato, cercheremo il cestello associato:", cycleId);
                // Non impostiamo l'ID del cestello qui, lo otterremo dalla query
                // Possiamo impostare il ciclo e gestirlo dopo
                basketId = null; // Per ora lo impostiamo a null, verrà gestito diversamente
              }
            }
          }
          // Caso 3: Campo 'number' usato come ID fisico
          else if (basketData.number && typeof basketData.number === 'number') {
            // In questo caso abbiamo il numero fisico, non l'ID del database
            // Dobbiamo fare una query per ottenere l'ID dal numero fisico
            console.log("Trovato numero fisico del cestello, lo useremo per cercare l'ID:", basketData.number);
            // non impostiamo basketId qui, verrà gestito successivamente
            // Usiamo il physicalNumber invece dell'ID
            setScannedBasketId(0); // ID temporaneo
            setIsScanning(false);
            
            // Imposta il numero fisico del cestello per la ricerca
            toast({
              title: "Tag NFC rilevato",
              description: `Cestello #${basketData.number} identificato, caricamento dati...`,
            });
            
            // In questo caso cercheremo il cestello per numero fisico
            // L'API attuale supporta solo la ricerca per ID, quindi dobbiamo modificare
            // temporaneamente il comportamento per trattare il numero fisico come ID
            // Cercheremo tutti i cestelli e filtreremo per numero fisico
            // Nota: questo è un workaround, l'ideale sarebbe avere un endpoint specifico
            basketId = basketData.number;
            return;
          }
        }
        
        if (basketId !== null) {
          console.log("Dati del cestello ottenuti dal tag NFC, ID:", basketId);
          
          // Comportamento standard (visualizzazione in questa pagina)
          setScannedBasketId(basketId);
          setIsScanning(false);
          
          toast({
            title: "Tag NFC rilevato",
            description: `Cestello #${basketData.number || basketId} identificato con successo.`,
          });
          
          // Il reindirizzamento è stato disabilitato come richiesto
          if (basketData.redirectTo) {
            console.log("Trovato redirectTo nel tag NFC, ma reindirizzamento disabilitato:", basketData.redirectTo);
          }
          
          // Non fare nulla con redirectTo, semplicemente mostra i dati dell'operazione
        } else {
          console.error("Non è stato possibile determinare l'ID del cestello dai dati:", basketData);
          throw new Error("Impossibile identificare il cestello dai dati del tag NFC");
        }
      } else {
        console.error("Nessun record compatibile trovato nel tag:", records);
        throw new Error("Nessun dato cestello trovato nel tag NFC");
      }
    } catch (error) {
      console.error("Errore nell'elaborazione del tag NFC:", error);
      setScanError(error instanceof Error ? error.message : "Errore durante la lettura del tag NFC");
      setIsScanning(false);
    }
  };
  
  // Gestisce gli errori di scansione NFC
  const handleNFCError = (error: string) => {
    console.error("Errore NFC:", error);
    setScanError(error);
    setIsScanning(false);
    
    toast({
      title: "Errore di scansione",
      description: error,
      variant: "destructive",
    });
  };
  
  // Gestisce l'interruzione della scansione NFC
  const handleNFCAbort = () => {
    console.log("Scansione NFC interrotta");
    setIsScanning(false);
  };
  
  // Naviga alla pagina di gestione posizioni
  const goToPositionManagement = () => {
    if (scannedBasketId) {
      setLocation(`/flupsy-positions?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga alla pagina delle operazioni rapide
  const goToQuickOperations = () => {
    if (scannedBasketId) {
      setLocation(`/quick-operations?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga alla cronologia operazioni
  const goToBasketHistory = () => {
    if (scannedBasketId) {
      setLocation(`/operations?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga alla pagina delle annotazioni
  const goToAnnotations = () => {
    if (scannedBasketId) {
      setLocation(`/inventory?basketId=${scannedBasketId}&tab=annotations`);
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-6 text-center md:text-left`}>
        {isMobile ? 'FlupsyScan' : 'FlupsyScan Mobile'}
      </h1>
      
      {!scannedBasketId ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Scansione Tag NFC</CardTitle>
            <CardDescription className="text-center">
              {isMobile ? 
                "Tocca per iniziare e avvicina il telefono al tag" :
                "Avvicina il telefono al tag NFC della cesta per visualizzare i dati"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            {isScanning ? (
              <>
                <div className={`${isMobile ? 'w-40 h-40' : 'w-32 h-32'} rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse relative`}>
                  <ScanIcon className={`${isMobile ? 'h-20 w-20' : 'h-16 w-16'} text-primary`} />
                  {isMobile && (
                    <div className="absolute -bottom-2 w-full flex justify-center">
                      <span className="inline-block px-3 py-1 rounded-full bg-primary text-white text-xs animate-pulse">
                        Scansione in corso...
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-center text-muted-foreground mb-6">
                  {isMobile ? 
                    "Posiziona il telefono vicino al tag NFC della cesta..." :
                    "Avvicina il dispositivo al tag NFC..."
                  }
                </p>
                <Button 
                  variant="outline" 
                  onClick={stopScan}
                  className={isMobile ? "w-full" : ""}
                  size={isMobile ? "lg" : "default"}
                >
                  <XIcon className="mr-2 h-4 w-4" /> Annulla scansione
                </Button>
                
                {/* Componente NFC Reader attivo solo durante la scansione */}
                {isScanning && (
                  <NFCReader
                    onRead={handleNFCRead}
                    onError={handleNFCError}
                    onAbort={handleNFCAbort}
                  />
                )}
              </>
            ) : (
              <>
                <div 
                  className={`${isMobile ? 'w-60 h-60' : 'w-48 h-48'} rounded-full bg-primary/10 flex items-center justify-center mb-6 cursor-pointer hover:bg-primary/20 transition-colors relative shadow-lg`}
                  onClick={startScan}
                >
                  <ScanIcon className={`${isMobile ? 'h-32 w-32' : 'h-24 w-24'} text-primary`} />
                  
                  {/* Etichetta visibile solo su mobile */}
                  {isMobile && (
                    <div className="absolute -bottom-2 w-full flex justify-center">
                      <span className="inline-block px-4 py-2 rounded-full bg-primary text-white text-sm">
                        Tocca per iniziare
                      </span>
                    </div>
                  )}
                </div>
                
                <Button 
                  size="lg" 
                  onClick={startScan}
                  className={isMobile ? "w-full py-6 text-lg" : ""}
                >
                  {isMobile ? "INIZIA SCANSIONE" : "Inizia Scansione"}
                </Button>
                
                {/* Messaggio di errore visualizzato solo in caso di problemi */}
                {scanError && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>Errore di scansione</AlertTitle>
                    <AlertDescription>{scanError}</AlertDescription>
                  </Alert>
                )}
                
                {/* Messaggio per desktop */}
                {!isMobile && (
                  <Alert className="mt-6">
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle>Modalità simulazione</AlertTitle>
                    <AlertDescription>
                      Stai utilizzando un dispositivo desktop. La scansione NFC è disponibile solo su dispositivi mobili compatibili.
                      Usa il bottone sopra per simulare una scansione a scopo di test.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stato di caricamento */}
          {isLoadingBasket && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Caricamento dati del cestello...</p>
            </div>
          )}
          
          {/* Errore di caricamento */}
          {basketError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>
                Impossibile caricare i dati del cestello.
                <Button variant="link" onClick={() => setScannedBasketId(null)}>
                  Torna alla scansione
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Visualizzazione dati cestello */}
          {basketData && (
            <>
              {/* Intestazione con numero cestello e posizione - Ottimizzata per mobile */}
              <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-6`}>
                <div className={isMobile ? 'flex flex-col items-center text-center' : ''}>
                  <h2 className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>
                    Cestello #{basketData?.physicalNumber}
                  </h2>
                  {basketData?.flupsy && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {basketData.flupsy.name}
                    </p>
                  )}
                  {basketData?.row && basketData?.position && (
                    <Badge variant="outline" className={`text-sm ${isMobile ? 'mt-2' : ''}`}>
                      Posizione: {basketData.row}-{basketData.position}
                    </Badge>
                  )}
                </div>
                <Button 
                  variant={isMobile ? "default" : "ghost"} 
                  onClick={() => setScannedBasketId(null)}
                  className={isMobile ? "w-full mt-2" : ""}
                  size={isMobile ? "lg" : "default"}
                >
                  <ScanIcon className="h-4 w-4 mr-2" /> {isMobile ? "Scansiona nuovo cestello" : "Nuova scansione"}
                </Button>
              </div>
              
              {/* Card principale con ultima operazione - Migliorata per mobile */}
              <Card className="mb-6">
                <CardHeader className={isMobile ? "pb-3" : ""}>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Ultima operazione</CardTitle>
                      <CardDescription>
                        {basketData?.lastOperation?.date ? (
                          `${new Date(basketData.lastOperation.date).toLocaleDateString('it-IT')}`
                        ) : (
                          'Nessuna operazione registrata'
                        )}
                      </CardDescription>
                    </div>
                    
                    {basketData?.lastOperation && (
                      <Badge className={getOperationTypeColor(basketData.lastOperation.type)}>
                        {getOperationTypeLabel(basketData.lastOperation.type)}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {basketData?.lastOperation ? (
                    <div className="space-y-4">
                      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
                        {basketData.lastOperation.animalsPerKg && (
                          <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">Animali per Kg</p>
                            <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>
                              {formatNumberWithCommas(basketData.lastOperation.animalsPerKg)}
                            </p>
                          </div>
                        )}
                        
                        {basketData.lastOperation.averageWeight && (
                          <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">Peso medio</p>
                            <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>
                              {formatNumberWithCommas(basketData.lastOperation.averageWeight)} mg
                            </p>
                          </div>
                        )}
                        
                        {basketData.lastOperation.sizeId && basketData?.size && (
                          <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">Taglia</p>
                            <div className="mt-2">
                              <Badge className={`text-lg py-1 px-3 bg-${getSizeColor(basketData.size.code)}-500`}>
                                {basketData.size.code} - {basketData.size.name}
                              </Badge>
                            </div>
                          </div>
                        )}
                        
                        {basketData.lastOperation.mortalityRate !== null && (
                          <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">Mortalità</p>
                            <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>
                              {basketData.lastOperation.mortalityRate}%
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {basketData.lastOperation.notes && (
                        <div className={`mt-4 ${isMobile ? 'p-4 border rounded-lg' : ''}`}>
                          <p className="text-sm font-medium text-muted-foreground">Note</p>
                          <p className="text-sm mt-1">{basketData.lastOperation.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircleIcon className="h-8 w-8 text-muted-foreground/50" />
                        <p>Nessuna operazione registrata per questo cestello.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Info sul ciclo attivo - Ottimizzato per mobile */}
              {basketData?.currentCycle && (
                <Card className="mb-6">
                  <CardHeader className={isMobile ? "pb-3" : ""}>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Ciclo attivo</CardTitle>
                        <CardDescription>
                          Iniziato il {new Date(basketData.currentCycle.startDate).toLocaleDateString('it-IT')}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {basketData.currentCycle.state}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`grid grid-cols-2 gap-4 ${isMobile ? 'mt-2' : ''}`}>
                      <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                        <p className="text-sm font-medium text-muted-foreground">Durata</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold`}>
                            {basketData?.cycleDuration}
                          </p>
                          <p className="text-muted-foreground">giorni</p>
                        </div>
                      </div>
                      <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                        <p className="text-sm font-medium text-muted-foreground">SGR attuale</p>
                        <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold mt-1`}>
                          {basketData?.growthRate ? `${basketData.growthRate}%` : 'N/D'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Menu di azioni rapide - Layout ottimizzato per mobile */}
              <Card>
                <CardHeader>
                  <CardTitle>Azioni rapide</CardTitle>
                  <CardDescription>Seleziona un'operazione da eseguire</CardDescription>
                </CardHeader>
                <CardContent className={`${isMobile ? 'grid grid-cols-2 gap-4' : 'grid gap-4'}`}>
                  {isMobile ? (
                    <>
                      {/* Layout per dispositivi mobili con pulsanti a griglia */}
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center space-y-2 p-2"
                        onClick={goToPositionManagement}
                      >
                        <MoveIcon className="h-8 w-8" />
                        <span className="text-xs text-center">Gestione posizione</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center space-y-2 p-2"
                        onClick={goToQuickOperations}
                      >
                        <ClipboardIcon className="h-8 w-8" />
                        <span className="text-xs text-center">Registra operazione</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center space-y-2 p-2"
                        onClick={goToBasketHistory}
                      >
                        <HistoryIcon className="h-8 w-8" />
                        <span className="text-xs text-center">Cronologia operazioni</span>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="h-24 flex flex-col items-center justify-center space-y-2 p-2"
                        onClick={goToAnnotations}
                      >
                        <Target className="h-8 w-8" />
                        <span className="text-xs text-center">Annotazioni taglia</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Layout per desktop con pulsanti orizzontali */}
                      <Button 
                        variant="outline" 
                        className="justify-between"
                        onClick={goToPositionManagement}
                      >
                        <div className="flex items-center">
                          <MoveIcon className="h-4 w-4 mr-2" />
                          <span>Gestione posizione</span>
                        </div>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="justify-between"
                        onClick={goToQuickOperations}
                      >
                        <div className="flex items-center">
                          <ClipboardIcon className="h-4 w-4 mr-2" />
                          <span>Registra operazione</span>
                        </div>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="justify-between"
                        onClick={goToBasketHistory}
                      >
                        <div className="flex items-center">
                          <HistoryIcon className="h-4 w-4 mr-2" />
                          <span>Cronologia operazioni</span>
                        </div>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="justify-between"
                        onClick={goToAnnotations}
                      >
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-2" />
                          <span>Annotazioni taglia</span>
                        </div>
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}