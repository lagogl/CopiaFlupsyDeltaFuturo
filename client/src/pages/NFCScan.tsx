import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import NFCReader from '@/components/NFCReader';
import { formatNumberWithCommas, getOperationTypeLabel, getOperationTypeColor, getSizeColor } from '@/lib/utils';
import { wechatNFCBridge } from '@/nfc-features/utils/wechatNFCBridge';
import { nfcService } from '@/nfc-features/utils/nfcService';
import { bluetoothNFCDetector } from '@/nfc-features/utils/bluetoothNFCDetector';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  Scan as ScanIcon,
  X as XIcon, 
  AlertCircle as AlertCircleIcon,
  Info as InfoIcon,
  Clipboard as ClipboardIcon,
  History as HistoryIcon,
  Move as MoveIcon, 
  ChevronRight as ChevronRightIcon,
  Target
} from 'lucide-react';

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

export default function NFCScan({ params }: { params?: { id?: string } }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedBasketId, setScannedBasketId] = useState<number | null>(null);
  const [basketData, setBasketData] = useState<BasketDetails | null>(null);
  const [isLoadingBasket, setIsLoadingBasket] = useState(false);
  const [basketError, setBasketError] = useState<Error | null>(null);
  
  // Determina se siamo su un dispositivo mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );
  
  // Determina quale sistema NFC utilizzare
  const [nfcMode, setNfcMode] = useState<'wechat' | 'native' | 'unavailable'>('unavailable');
  
  useEffect(() => {
    // Usa la stessa logica di rilevamento NFC del modulo NFCTagManager che funziona
    const supportInfo = nfcService.getNFCSupportType();
    console.log('🔍 FlupsyScan - Rilevamento NFC:', supportInfo);
    
    if (supportInfo.type === 'wechat-bridge' || supportInfo.type === 'bluetooth-bridge') {
      setNfcMode('wechat');
      wechatNFCBridge.initialize();
      console.log('✅ WeChat/Bluetooth Bridge attivato per FlupsyScan');
      console.log('🔧 Forzo utilizzo lettore fisico NFC Tool Pro rilevato');
    } else if (supportInfo.type === 'native' && isMobile) {
      setNfcMode('native');
      console.log('✅ Lettore nativo attivato per mobile');
    } else {
      // Forza WeChat bridge anche se non rilevato correttamente (per compatibilità con NFC Tool Pro)
      setNfcMode('wechat');
      wechatNFCBridge.initialize();
      console.log('⚙️ Forzatura WeChat Bridge per compatibilità NFC Tool Pro');
    }
  }, [isMobile]);
  
  // Se c'è un ID nei parametri, carica subito i dettagli del cestello
  useEffect(() => {
    if (params?.id) {
      setScannedBasketId(parseInt(params.id));
    }
  }, [params]);
  
  // Quando viene impostato un ID cestello, carica i dati del cestello
  useEffect(() => {
    if (!scannedBasketId) return;
    
    const fetchBasketData = async () => {
      try {
        setIsLoadingBasket(true);
        setBasketError(null);
        
        console.log("Richiesta diretta a:", `/api/baskets/details/${scannedBasketId}`);
        const response = await fetch(`/api/baskets/details/${scannedBasketId}`);
        
        if (!response.ok) {
          throw new Error(`Errore caricamento dati: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("DATI RICEVUTI:", data);
        setBasketData(data);
      } catch (error) {
        console.error("Errore caricamento dati cestello:", error);
        setBasketData(null);
        setBasketError(error as Error);
      } finally {
        setIsLoadingBasket(false);
      }
    };
    
    fetchBasketData();
  }, [scannedBasketId]);
  
  // Avvia la scansione NFC (STESSA LOGICA del modulo di scrittura funzionante)
  const startScan = async () => {
    console.log("Avvio scansione NFC");
    setIsScanning(true);
    setScanError(null);
    
    try {
      // 1. Prova WeChat NFC Bridge se disponibile (STESSA LOGICA DI NFCWriter)
      if (wechatNFCBridge.isWeChatAvailable()) {
        console.log('🔄 Usando WeChat NFC Bridge per lettura...');
        await readViaWeChatBridge();
        return;
      }

      // 2. Usa Web NFC API standard se disponibile  
      if ('NDEFReader' in window) {
        await handleNativeNFC();
        return;
      }

      // 3. Fallback su simulazione
      await handleSimulationFallback();

    } catch (error: any) {
      console.error('Errore durante la lettura NFC:', error);
      handleNFCError(error.message || 'Errore durante la lettura del tag NFC');
      setIsScanning(false);
    }
  };

  // Lettura via WeChat Bridge (identica alla scrittura)
  const readViaWeChatBridge = async () => {
    try {
      console.log('📖 Lettura WeChat NFC Bridge...');
      
      const result = await wechatNFCBridge.readNFCTag();
      
      if (result.success && result.data) {
        console.log('✅ Tag letto con successo via WeChat:', result.data);
        
        // Converti nel formato NFCReader per compatibilità
        handleNFCRead([{
          recordType: 'text',
          data: JSON.stringify({
            id: result.data.basketId,
            number: result.data.physicalNumber,
            redirectTo: result.data.url
          })
        }]);
      } else {
        handleNFCError(result.error || 'Errore lettura WeChat NFC');
      }
    } catch (error: any) {
      console.error('Errore WeChat bridge lettura:', error);
      handleNFCError(error.message || 'Errore comunicazione lettore NFC');
    } finally {
      setIsScanning(false);
    }
  };

  // Gestione NFC nativo (per mobile)
  const handleNativeNFC = async () => {
    // Questa logica viene gestita dal componente NFCReader per mobile
    console.log('🔄 Avvio lettura NFC nativa...');
  };

  // Fallback simulazione
  const handleSimulationFallback = async () => {
    console.log('🎭 Avvio simulazione NFC...');
    // Logica simulazione se necessaria
  };
  
  // Interrompe la scansione NFC
  const stopScan = () => {
    console.log("Interruzione scansione NFC");
    setIsScanning(false);
  };
  
  // Riproduce un suono di conferma
  const playConfirmationSound = () => {
    try {
      // Usa un oscillatore Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = 1800;
      gainNode.gain.value = 0.1;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 150);
    } catch (e) {
      console.error("Errore audio:", e);
    }
  };
  
  // Gestisce la lettura NFC
  const handleNFCRead = (records: any) => {
    console.log("Tag NFC letto:", records);
    playConfirmationSound();
    
    let basketId = null;
    
    try {
      if (Array.isArray(records) && records.length > 0) {
        console.log("Record trovati:", records.length);
        
        const textRecord = records.find(r => r.recordType === 'text');
        
        if (textRecord && textRecord.data) {
          console.log("Testo record:", textRecord.data);
          
          if (typeof textRecord.data === 'string' && textRecord.data.startsWith('{')) {
            try {
              const jsonData = JSON.parse(textRecord.data);
              console.log("JSON estratto:", jsonData);
              
              if (jsonData.id) {
                basketId = jsonData.id;
                console.log(`Trovato ID cestello: ${basketId}`);
              }
            } catch (jsonError) {
              console.error("Errore parsing JSON:", jsonError);
            }
          }
        }
      }
    } catch (e) {
      console.error("Errore elaborazione tag:", e);
    }
    
    if (!basketId) {
      setScanError("Tag NFC non valido. Il tag non contiene un ID cestello valido.");
      return;
    }
    
    setScannedBasketId(basketId);
    setIsScanning(false);
  };
  
  // Gestisce gli errori NFC
  const handleNFCError = (error: string) => {
    console.error("Errore NFC:", error);
    setScanError(error);
    setIsScanning(false);
  };
  
  // Naviga a pagina di gestione posizione
  const goToPositionManagement = () => {
    if (scannedBasketId) {
      setLocation(`/flupsy-positions?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga a operazioni rapide
  const goToQuickOperations = () => {
    if (scannedBasketId) {
      setLocation(`/quick-operations?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga a cronologia operazioni
  const goToBasketHistory = () => {
    if (scannedBasketId) {
      setLocation(`/operations?basketId=${scannedBasketId}`);
    }
  };
  
  // Naviga a annotazioni
  const goToAnnotations = () => {
    if (scannedBasketId) {
      setLocation(`/inventory?basketId=${scannedBasketId}&tab=annotations`);
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Intestazione principale dell'app */}
      <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 text-center md:text-left`}>
        {isMobile ? 'FlupsyScan' : 'FlupsyScan Mobile'}
      </h1>

      {/* Aggiunta delle informazioni in rosso sul ciclo e FLUPSY */}
      {basketData && basketData.currentCycle && basketData.flupsy && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2 mb-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <span className="font-bold text-red-600 mr-2">Ciclo #{basketData.currentCycle.id}</span>
              <span className="text-red-500">({new Date(basketData.currentCycle.startDate).toLocaleDateString('it-IT')})</span>
            </div>
            <div className="mt-1 md:mt-0">
              <span className="font-bold text-red-600">{basketData.flupsy.name}</span>
            </div>
          </div>
        </div>
      )}
      
      {!scannedBasketId ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Scansione Tag NFC</CardTitle>
            <CardDescription className="text-center">
              {isMobile ? 
                "Tocca per iniziare e avvicina il telefono al tag" :
                nfcMode === 'wechat' ? 
                  "Utilizzo WeChat bridge - Avvicina il tag al lettore NFC Tool Pro" :
                  "Avvicina il dispositivo al tag NFC della cesta per visualizzare i dati"
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
                    nfcMode === 'wechat' ?
                      "Utilizzo WeChat bridge - Posiziona il tag vicino al lettore NFC Tool Pro..." :
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
                
                {/* Componente NFC Reader attivo solo durante la scansione - SOLO se NON in modalità WeChat */}
                {isScanning && nfcMode !== 'wechat' && (
                  <NFCReader
                    onRead={handleNFCRead}
                    onError={handleNFCError}
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
                    <AlertTitle>
                      {nfcMode === 'wechat' ? 'WeChat Bridge rilevato' : 'Modalità desktop'}
                    </AlertTitle>
                    <AlertDescription>
                      {nfcMode === 'wechat' ? 
                        'Sistema NFC Tool Pro disponibile tramite WeChat bridge. Assicurati che WeChat e NFC Tool Pro siano attivi.' :
                        'Stai utilizzando un dispositivo desktop. La scansione NFC è disponibile solo su dispositivi mobili compatibili.'
                      }
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
              
              {/* Card principale con ultima operazione */}
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
                        
                        {/* Tasso di crescita SGR se disponibile */}
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
              
              {/* Info sul ciclo attivo */}
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
              
              {/* Menu di azioni rapide */}
              <Card>
                <CardHeader>
                  <CardTitle>Azioni rapide</CardTitle>
                  <CardDescription>Seleziona un'operazione da eseguire</CardDescription>
                </CardHeader>
                <CardContent className={`${isMobile ? 'grid grid-cols-2 gap-4' : 'grid gap-4'}`}>
                  {isMobile ? (
                    <>
                      {/* Layout per mobile */}
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
                      {/* Layout per desktop */}
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