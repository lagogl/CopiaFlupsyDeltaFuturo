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

export default function NFCScan() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBasketId, setScannedBasketId] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Query per ottenere i dati del cestello scansionato
  const { 
    data: basketData,
    isLoading: isLoadingBasket,
    error: basketError
  } = useQuery<BasketDetails>({
    queryKey: ['/api/baskets/details', scannedBasketId],
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
          } catch (e) {
            // Se non è JSON, potrebbe essere un ID diretto
            const basketId = parseInt(basketRecord.data);
            if (!isNaN(basketId)) {
              basketData = { id: basketId };
            }
          }
        } else if (typeof basketRecord.data === 'object') {
          basketData = basketRecord.data;
        }
        
        if (basketData && basketData.id) {
          setScannedBasketId(basketData.id);
          setIsScanning(false);
          
          toast({
            title: "Tag NFC rilevato",
            description: `Cestello #${basketData.id} identificato con successo.`,
          });
        } else {
          throw new Error("Formato tag NFC non valido");
        }
      } else {
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
      <h1 className="text-3xl font-bold mb-6">FlupsyScan Mobile</h1>
      
      {!scannedBasketId ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Scansione Tag NFC</CardTitle>
            <CardDescription className="text-center">
              Avvicina il telefono al tag NFC della cesta per visualizzare i dati
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            {isScanning ? (
              <>
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                  <ScanIcon className="h-16 w-16 text-primary" />
                </div>
                <p className="text-center text-muted-foreground mb-6">
                  Avvicina il dispositivo al tag NFC...
                </p>
                <Button variant="outline" onClick={stopScan}>
                  <XIcon className="mr-2 h-4 w-4" /> Annulla
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
                  className="w-48 h-48 rounded-full bg-primary/10 flex items-center justify-center mb-6 cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={startScan}
                >
                  <ScanIcon className="h-24 w-24 text-primary" />
                </div>
                <Button size="lg" onClick={startScan}>
                  Inizia Scansione
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
              {/* Intestazione con numero cestello e posizione */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Cestello #{basketData?.physicalNumber}
                  </h2>
                  {basketData?.row && basketData?.position && (
                    <Badge variant="outline" className="text-sm">
                      Posizione: {basketData.row}-{basketData.position}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" onClick={() => setScannedBasketId(null)}>
                  <ScanIcon className="h-4 w-4 mr-2" /> Nuova scansione
                </Button>
              </div>
              
              {/* Card principale con ultima operazione */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Ultima operazione</CardTitle>
                  <CardDescription>
                    {basketData?.lastOperation?.date ? (
                      `Effettuata il ${new Date(basketData.lastOperation.date).toLocaleDateString('it-IT')}`
                    ) : (
                      'Nessuna operazione registrata'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {basketData?.lastOperation ? (
                    <div className="space-y-4">
                      <div className="flex items-center">
                        <Badge className={getOperationTypeColor(basketData.lastOperation.type)}>
                          {getOperationTypeLabel(basketData.lastOperation.type)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {basketData?.lastOperation?.animalsPerKg && (
                          <div>
                            <p className="text-sm font-medium">Animali per Kg</p>
                            <p className="text-2xl font-bold">{formatNumberWithCommas(basketData.lastOperation.animalsPerKg)}</p>
                          </div>
                        )}
                        
                        {basketData?.lastOperation?.averageWeight && (
                          <div>
                            <p className="text-sm font-medium">Peso medio</p>
                            <p className="text-2xl font-bold">{formatNumberWithCommas(basketData.lastOperation.averageWeight)} mg</p>
                          </div>
                        )}
                        
                        {basketData?.lastOperation?.sizeId && basketData?.size && (
                          <div>
                            <p className="text-sm font-medium">Taglia</p>
                            <Badge className={`bg-${getSizeColor(basketData.size.code)}-500`}>
                              {basketData.size.code} - {basketData.size.name}
                            </Badge>
                          </div>
                        )}
                        
                        {basketData?.lastOperation?.mortalityRate !== null && basketData?.lastOperation?.mortalityRate !== undefined && (
                          <div>
                            <p className="text-sm font-medium">Mortalità</p>
                            <p className="text-lg font-semibold">{basketData.lastOperation.mortalityRate}%</p>
                          </div>
                        )}
                      </div>
                      
                      {basketData?.lastOperation?.notes && (
                        <div>
                          <p className="text-sm font-medium">Note</p>
                          <p className="text-sm">{basketData.lastOperation.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Nessuna operazione registrata per questo cestello.
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Info sul ciclo attivo */}
              {basketData?.currentCycle && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Ciclo attivo</CardTitle>
                    <CardDescription>
                      Iniziato il {new Date(basketData.currentCycle.startDate).toLocaleDateString('it-IT')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Durata</p>
                        <p className="text-xl font-bold">
                          {basketData?.cycleDuration} giorni
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">SGR attuale</p>
                        <p className="text-xl font-bold">
                          {basketData?.growthRate ? `${basketData.growthRate}%` : 'N/D'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Menu di azioni rapide */}
              <Card>
                <CardHeader>
                  <CardTitle>Azioni rapide</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
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
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}