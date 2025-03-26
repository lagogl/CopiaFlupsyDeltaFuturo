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
  const [basketData, setBasketData] = useState<BasketDetails | null>(null);
  const [isLoadingBasket, setIsLoadingBasket] = useState<boolean>(false);
  const [basketError, setBasketError] = useState<Error | null>(null);
  
  // Effetto per caricare i dati del cestello quando cambia lo scannedBasketId
  useEffect(() => {
    const fetchBasketData = async () => {
      if (!scannedBasketId) return;
      
      setIsLoadingBasket(true);
      setBasketError(null);
      
      try {
        console.log(`Richiesta diretta a: /api/baskets/details/${scannedBasketId}`);
        const response = await fetch(`/api/baskets/details/${scannedBasketId}`);
        
        if (!response.ok) {
          throw new Error(`Errore nella richiesta: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("DATI RICEVUTI:", data);
        setBasketData(data);
      } catch (error) {
        console.error("Errore nel caricamento dei dati del cestello:", error);
        setBasketError(error as Error);
      } finally {
        setIsLoadingBasket(false);
      }
    };
    
    fetchBasketData();
  }, [scannedBasketId]);
  
  // Gestisce l'avvio della scansione NFC
  const startScan = () => {
    console.log("Avvio scansione NFC...");
    // Reset dei valori iniziali
    setIsScanning(true);
    setScanError(null);
  };
  
  // Gestisce l'interruzione della scansione NFC
  const stopScan = () => {
    setIsScanning(false);
  };
  
  // Riproduce un suono di conferma
  const playConfirmationSound = () => {
    try {
      // Crea un nuovo elemento audio
      const audio = new Audio();
      // Imposta l'URL del file audio (beep di conferma)
      audio.src = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."; // Base64 troncato per brevità
      
      // Oppure usa un semplice oscillatore Web Audio API (alternativa più affidabile)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = 1800; // Frequenza in Hz
      gainNode.gain.value = 0.1; // Volume basso per non disturbare
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 150); // Durata del beep in millisecondi
    } catch (e) {
      console.error("Errore nella riproduzione dell'audio:", e);
      // Non blocchiamo il flusso se l'audio fallisce
    }
  };

  // Gestisce la lettura del tag NFC - gestisce sia dati reali che simulati
  const handleNFCRead = (records: any) => {
    console.log("NFC tag letto:", records);
    
    // Riproduce un suono di conferma
    playConfirmationSound();
    
    // Estrattore di informazioni dal tag
    let basketId = null;
    let basketNumber = null;
    
    try {
      // Tenta di estrarre i dati JSON dal record
      if (Array.isArray(records) && records.length > 0) {
        console.log("Record trovati:", records.length);
        
        // Trova il primo record di testo
        const textRecord = records.find(r => r.recordType === 'text');
        
        if (textRecord && textRecord.data) {
          console.log("Testo record:", textRecord.data);
          
          // Se è una stringa JSON, la analizziamo
          if (typeof textRecord.data === 'string' && textRecord.data.startsWith('{')) {
            try {
              const jsonData = JSON.parse(textRecord.data);
              console.log("JSON estratto:", jsonData);
              
              // Estrai ID cestello e numero fisico
              if (jsonData.id) {
                basketId = jsonData.id;
                basketNumber = jsonData.number || null;
                console.log(`Trovato ID cestello: ${basketId}, numero: ${basketNumber}`);
              }
            } catch (jsonError) {
              console.error("Errore nell'analisi JSON:", jsonError);
            }
          }
        }
      }
    } catch (e) {
      console.error("Errore nell'elaborazione del tag:", e);
    }
    
    // Se non siamo riusciti a estrarre un ID dal tag, mostriamo un errore
    if (!basketId) {
      console.log("ID cestello non trovato nel tag");
      // Mostra un errore invece di impostare un ID di default
      setScanError("Tag NFC non valido. Il tag non contiene un ID cestello valido.");
      return; // Interrompe l'elaborazione
    }
    
    // Imposta l'ID del cestello scansionato
    setScannedBasketId(basketId);
    setIsScanning(false);
    
    // Rimosso il toast di notifica come richiesto
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
                        
                        {/* Aggiungiamo il tasso di crescita SGR se disponibile */}
                        {basketData.growthRate && basketData.operations && basketData.operations.length > 1 && (
                          <div className={`p-4 rounded-lg ${isMobile ? 'bg-primary/5' : ''}`}>
                            <p className="text-sm font-medium text-muted-foreground">SGR</p>
                            <p className={`${isMobile ? 'text-3xl' : 'text-2xl'} font-bold flex items-center`}>
                              {basketData.growthRate.toFixed(2)}%
                              <span className="text-xs ml-1 text-muted-foreground">/giorno</span>
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